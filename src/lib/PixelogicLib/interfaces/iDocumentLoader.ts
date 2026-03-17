import type Document from '../Document'

export default interface iDocumentLoader {
	loadData: (file: File) => Promise<Document>
}
