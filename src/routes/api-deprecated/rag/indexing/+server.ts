import TextEmbedder from '$lib/PixelogicLib/embeddings/TextEmbedder'
import AdjacentSequenceClustering from '$lib/PixelogicLib/indexing-strategies/AdjacentSequenceClustering'
import PageSummarization from '$lib/PixelogicLib/indexing-strategies/ParagraphSummarization'
import OcrDocumentLoader from '$lib/PixelogicLib/loaders/OcrDocumentLoader'
import logger from '$lib/Utils/logger'
import { uuid } from '$lib/Utils/utils'
import type { InsertStudyChunk } from '$lib/database/types'
import { error, type RequestHandler } from '@sveltejs/kit'

const SUPPORTED_FILE_TYPES = ['pdf', 'png', 'jpg', 'txt']

export const POST: RequestHandler = async ({ request, locals: { supabase, getSession } }) => {
	if (!request.body) throw error(404, 'Invalid Request: No body')

	logger.info('Loading File for Indexing...')

	const form_data = await request.formData()
	const file = form_data.get('file') as File
	const document_name = form_data.get('name') as string
	const class_id = form_data.get('class_id') as string

	const session = await getSession()
	const user_id = session?.user.id
	if (!user_id) throw error(404, `Invalid Request: Unauthorized User`)

	if (!document_name) throw error(404, `Invalid Request: Missing document name`)
	if (!class_id) throw error(404, `Invalid Request: Missing class id`)

	const ext = file.name.split('.').pop() ?? ''

	if (!SUPPORTED_FILE_TYPES.includes(ext))
		throw error(404, `Invalid Request: Unsupported file type ${ext}`)

	logger.info('Loaded File.')
	logger.info('Loading Document Data...')

	// const pdf_document_loader = new PdfDocumentLoader()
	const pdf_document_loader = new OcrDocumentLoader()

	const document = await pdf_document_loader.loadData(file)
	logger.info('Loaded Document Data.')

	const embedding_model = new TextEmbedder()
	await embedding_model.initialize('Supabase/gte-small')

	logger.info('Chunking Document Pages...')
	const adjacent_sequence_clustering = new AdjacentSequenceClustering(embedding_model)
	const chunked_pages = await adjacent_sequence_clustering.chunkPages(document.getPages())
	logger.info('Chunked Pages.')

	logger.info('Summarizing Pages...')
	const page_summarizer = new PageSummarization(embedding_model)
	const sumarized_pages = await page_summarizer.summarizePages(chunked_pages)
	logger.info('Pages Summarized.')

	const new_document_id = uuid()
	const file_path = `${user_id}/${new_document_id}.pdf`
	const insert_document_call = await supabase
		.from('study_material')
		.insert({
			id: new_document_id,
			file_path,
			title: document_name,
			class_id,
		})
		.select()

	if (insert_document_call.error)
		throw error(404, `${insert_document_call.error.code}: ${insert_document_call.error.message}`)

	const inserted_document = insert_document_call.data[0]


	const upload_file_call = await supabase.storage.from('documents').upload(file_path, file)

	if (upload_file_call.error) throw error(404, upload_file_call.error)

	const insert_pages_call = await supabase
		.from('study_chapter')
		.insert(
			sumarized_pages.map((p, i) => ({
				material_id: inserted_document.id,
				page_num: i + 1,
			})),
		)
		.select()

	if (insert_pages_call.error)
		throw error(404, `${insert_pages_call.error.code}: ${insert_pages_call.error.message}`)

	const inserted_pages = insert_pages_call.data

	const prepared_chunks = inserted_pages.reduce<Array<InsertStudyChunk>>((res, inserted_page) => {
		const summarized_page = sumarized_pages[inserted_page.page_num - 1]
		summarized_page.getChunks().forEach((chunk, i) => {
			res.push({
				chunk_order: i + 1,
				content: chunk.getText(),
				embedding: JSON.stringify(chunk.getEmbedding()),
				chapter_id: inserted_page.id,
			})
		})
		return res
	}, [])

	const insert_chunks_call = await supabase.from('study_chunk').insert(prepared_chunks).select()

	if (insert_chunks_call.error)
		throw error(404, `${insert_chunks_call.error.code}: ${insert_chunks_call.error.message}`)

	logger.info('Index Successful!')

	return new Response()
}
