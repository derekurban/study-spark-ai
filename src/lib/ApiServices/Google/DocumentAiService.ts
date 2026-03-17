import { DocumentProcessorServiceClient, type protos } from '@google-cloud/documentai'
import type { google } from '@google-cloud/documentai/build/protos/protos'

export default class DocumentAiService {
	private product_namespace: string
	private client: DocumentProcessorServiceClient
	constructor(product_namespace: string, service_credentials: string) {
		this.product_namespace = product_namespace
		this.client = new DocumentProcessorServiceClient({
			credentials: JSON.parse(service_credentials),
		})
	}

	public async extractContent(content: string | Uint8Array, mime_type: string) {
		const doc_request: protos.google.cloud.documentai.v1.IProcessRequest = {
			name: this.product_namespace,
			rawDocument: {
				content: content,
				mimeType: mime_type,
			},
		}

		let document: google.cloud.documentai.v1.IDocument
		const process_result = await this.client.processDocument(doc_request)
		if (process_result[0].document) {
			document = process_result[0].document
			return document
		} else {
			throw new Error(
				`Missing Document Error: Google's DocumentAI couldn't process document: ${process_result}`,
			)
		}
	}
}
