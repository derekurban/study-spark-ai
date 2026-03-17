import type Chunk from './Chunk'

export default class Page {
	private chunks: Array<Chunk>
	private summary: string
	private embedding: Array<number>
	private raw_content: string
	constructor(options?: {
		chunks?: Array<Chunk>
		summary?: string
		embedding?: Array<number>
		raw_content?: string
	}) {
		this.chunks = options?.chunks ?? []
		this.summary = options?.summary ?? ''
		this.raw_content = options?.raw_content ?? ''
		this.embedding = options?.embedding ?? []
	}

	public getRawText() {
		return this.raw_content
	}

	public hasText() {
		return this.chunks && this.chunks.length > 0 && !!this.chunks.find((c) => !!c.getText())
	}

	public getText() {
		if (this.chunks.length > 0) return this.chunks.map((c) => c.getText()).join(' ')
		console.log(this.chunks)
		throw Error(`Can't get text with no chunks`)
	}

	public setSummary(summary: string) {
		this.summary = summary
	}

	public getChunks() {
		return this.chunks
	}

	public getSummary() {
		return this.summary
	}

	public setEmbedding(embedding: Array<number>) {
		this.embedding = embedding
	}

	public getEmbedding() {
		return this.embedding
	}
}
