import DocumentAiService from '$lib/ApiServices/Google/DocumentAiService'
import type iDocumentLoader from '../interfaces/iDocumentLoader'
import { PRIVATE_GOOGLE_DOCUMENTAI, PRIVATE_GOOGLE_SERVICE_KEY } from '$env/static/private'
import { PDFDocument } from 'pdf-lib'
import type iLogger from '../interfaces/iLogger'
import Document from '../Document'
import Page from '../Page'

export default class OcrDocumentLoader implements iDocumentLoader {
	private documentAiService: DocumentAiService
	private PAGE_LIMIT = 15
	private CONFIDENCE_THRESHOLD = 0.8
	private logger?: iLogger
	constructor(options?: { logger: iLogger }) {
		this.documentAiService = new DocumentAiService(
			PRIVATE_GOOGLE_DOCUMENTAI,
			PRIVATE_GOOGLE_SERVICE_KEY,
		)

		this.logger = options?.logger
	}
	async loadData(file: File): Promise<Document> {
		const ext = file.name.split('.').pop() ?? ''
		const mime_type = file.type

		this.logger?.info({ file_name: file.name }, 'Loading')

		if (ext != 'pdf' || mime_type != 'application/pdf') {
			throw new Error(
				`Pdf Load Error: Expected file with extension 'pdf' and mime type 'application/pdf', got extension '${ext}' and mime type '${mime_type}'`,
			)
		}

		const pdf_doc = await PDFDocument.load(await file.arrayBuffer())
		const pdf_pages = pdf_doc.getPages()

		this.logger?.debug({ file_name: file.name, page_count: pdf_pages.length }, 'Received Pages')

		const getContentFromPdfBundle = async (start_index: number) => {
			const end_index = Math.min(start_index + this.PAGE_LIMIT, pdf_pages.length)
			this.logger?.debug(
				{
					file_name: file.name,
					start_index,
					end_index,
				},
				'Starting Bundle ',
			)
			const pdf_clone = await PDFDocument.create()
			const page_bundle = await pdf_clone.copyPages(
				pdf_doc,
				[...Array(end_index - start_index).keys()].map((n) => n + start_index),
			)
			page_bundle.forEach((page) => pdf_clone.addPage(page))

			const encoded_pdf = await pdf_clone.saveAsBase64()

			const res = await this.documentAiService.extractContent(encoded_pdf, mime_type)
			this.logger?.debug(
				{
					file_name: file.name,
					start_index,
					end_index,
					success: !!res,
				},
				'Finished Bundle ',
			)
			return res
		}

		const page_bundle_processes = Array.from({ length: Math.ceil(pdf_pages.length / 15) }, (_, i) =>
			getContentFromPdfBundle(i * 15),
		)

		this.logger?.debug(
			{
				file_name: file.name,
				page_count: pdf_pages.length,
				bundle_count: Math.ceil(pdf_pages.length / 15),
			},
			'Bundling Pages',
		)

		const documents = await Promise.all(page_bundle_processes)

		const processed_pages = documents.reduce<Array<Page>>((res, document) => {
			if (!document.pages || !document.text) return res

			const document_text = document.text

			document.pages.forEach((page) => {
				if (!page.paragraphs) return

				let page_content = ''
				page.paragraphs.forEach((paragraph) => {
					const text_anchor = paragraph.layout?.textAnchor
					const confidence = paragraph.layout?.confidence ?? 0

					if (
						!text_anchor ||
						!text_anchor.textSegments ||
						text_anchor.textSegments.length == 0 ||
						confidence < this.CONFIDENCE_THRESHOLD
					)
						return

					const start_index = (text_anchor.textSegments[0].startIndex as number) || 0
					const end_index = text_anchor.textSegments[0].endIndex as number

					page_content += document_text.substring(start_index, end_index)
				})

				page_content = page_content.trim()

				if (page_content) res.push(new Page({ raw_content: page_content }))
			})

			return res
		}, [])

		this.logger?.info(
			{
				file_name: file.name,
				page_count: pdf_pages.length,
				bundle_count: Math.ceil(pdf_pages.length / 15),
				total_words: processed_pages
					.map((p) => p.getRawContent())
					.join(' ')
					.split(' ').length,
			},
			'Loaded',
		)

		return new Document({ pages: processed_pages })
	}
}
