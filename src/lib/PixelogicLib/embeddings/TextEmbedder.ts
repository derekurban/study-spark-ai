import { AutoTokenizer, Pipeline, pipeline, type PreTrainedTokenizer } from '@xenova/transformers'
import type iLogger from '../interfaces/iLogger'

type EmbeddingModel = 'Supabase/gte-small'

type EmbeddingInfo = Record<
	EmbeddingModel,
	{ TOKEN_LIMIT: number; embedding: boolean; summarization: boolean }
>

const EMBEDDING_INFO: EmbeddingInfo = {
	'Supabase/gte-small': {
		embedding: true,
		summarization: false,
		TOKEN_LIMIT: 512,
	},
}

export default class TextEmbedder {
	private tokenizer: PreTrainedTokenizer | undefined
	private embedder: Pipeline | undefined
	private summarizer: Pipeline | undefined
	private TOKEN_LIMIT: number | undefined

	private logger?: iLogger
	constructor(options?: { logger: iLogger }) {
		this.logger = options?.logger
	}

	public async initialize(model: keyof EmbeddingInfo) {
		this.TOKEN_LIMIT = EMBEDDING_INFO[model].TOKEN_LIMIT
		this.tokenizer = await AutoTokenizer.from_pretrained(model)
		this.embedder = EMBEDDING_INFO[model].embedding
			? await pipeline('feature-extraction', model)
			: undefined
		this.summarizer = EMBEDDING_INFO[model].summarization
			? await pipeline('summarization', model)
			: undefined
		this.logger?.info('Initialized Text Embedder')
	}

	public getTokenLimit() {
		if (!this.TOKEN_LIMIT) throw Error('Call TextEmbedder.initialize() before getting token limit')
		return this.TOKEN_LIMIT
	}

	public async generateEmbedding(text: string) {
		if (!this.embedder && !this.TOKEN_LIMIT)
			throw Error('This model does not support embedding generation')
		if (!this.embedder || !this.TOKEN_LIMIT)
			throw Error('Call TextEmbedder.initialize() before utilizing embedder')

		const embedding_data = await this.embedder(text, {
			pooling: 'mean',
			normalize: true,
		})

		if (!embedding_data || !embedding_data.data || embedding_data.data.length == 0) {
			throw new Error(`Embedding Error: Failed to embed: \n${text}\nReceived: ${embedding_data}`)
		}

		return Array.from(embedding_data.data) as Array<number>
	}

	public async summarizeText(text: string) {
		if (!this.summarizer && !this.TOKEN_LIMIT)
			throw Error('This model does not support summarization')
		if (!this.summarizer || !this.TOKEN_LIMIT)
			throw Error('Call TextEmbedder.initialize() before utilizing summarizer')

		const summarization = await this.summarizer(text)

		console.log(summarization)
	}

	public async countTokens(text: string) {
		if (!this.tokenizer) throw Error('Call TextEmbedder.initialize() before utilizing tokenizer')
		const {
			input_ids: { size },
		} = await this.tokenizer(text)
		return size as number
	}
}
