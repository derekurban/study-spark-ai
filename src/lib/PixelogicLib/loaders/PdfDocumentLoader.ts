import DocumentAiService from '$lib/ApiServices/Google/DocumentAiService'
import type iDocumentLoader from '../interfaces/iDocumentLoader'
import { PRIVATE_GOOGLE_DOCUMENTAI, PRIVATE_GOOGLE_SERVICE_KEY } from '$env/static/private'
import PDFParser from 'pdf2json'
import type iLogger from '../interfaces/iLogger'
import Document from '../Document'
import { replaceNonASCII } from '$lib/Utils/utils'
import Page from '../Page'

export default class PdfDocumentLoader implements iDocumentLoader {
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

		const pdf_parser = new PDFParser()
		const pdf_buffer = Buffer.from(await file.arrayBuffer())

		const text_by_pages: Array<string> = []

		await new Promise((resolve, reject) => {
			pdf_parser.on('pdfParser_dataError', reject)
			pdf_parser.on('pdfParser_dataReady', (data) => {
				data.Pages.forEach((page) => {
					text_by_pages.push(
						page.Texts.map((t) => {
							const decoded_text = replaceNonASCII(
								t.R.map((r) => decodeURIComponent(r.T)).join(' '),
							)
							return decoded_text
						}).join(' '),
					)
				})

				resolve(undefined)
			})

			pdf_parser.parseBuffer(pdf_buffer)
		})

		const processed_pages = text_by_pages.map((t) => new Page({ raw_content: t }))

		const result_text = text_by_pages.join(' ')

		this.logger?.info(
			{
				file_name: file.name,
				page_count: text_by_pages.length,
				total_words: result_text.split(' ').length,
			},
			'Loaded',
		)

		return new Document({ pages: processed_pages })
	}
}
