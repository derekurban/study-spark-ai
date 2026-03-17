export default class Chunk {
	private text: string
	private embedding: Array<number>
	constructor(options?: { text?: string; embedding?: Array<number> }) {
		this.text = options?.text ?? ''
		this.embedding = options?.embedding ?? []
	}

	public getEmbedding() {
		return this.embedding
	}

	public getText() {
		return this.text
	}
}
