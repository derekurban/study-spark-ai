import type TextEmbedder from '../embeddings/TextEmbedder'
import sentencize from '@stdlib/nlp-sentencize'
import type iLogger from '../interfaces/iLogger'
import { checkSimilarity } from '$lib/Utils/utils'
import Chunk from '../Chunk'
import ChatGptHandler from '$lib/PixelogicOpenAi/ChatGptHandler'
import { PRIVATE_OPENAI_API_KEY } from '$env/static/private'
import { isWithinTokenLimit } from 'gpt-tokenizer'
import gpt_prompts from '$lib/gptPrompts'
import type Page from '../Page'

export default class PageSummarization {
	private logger?: iLogger
	private text_embedder: TextEmbedder
	private gpt_handler: ChatGptHandler
	constructor(
		text_embedder: TextEmbedder,
		options?: { similarity_threshold?: number; logger: iLogger },
	) {
		this.text_embedder = text_embedder

		this.logger = options?.logger
		this.gpt_handler = new ChatGptHandler(PRIVATE_OPENAI_API_KEY)
	}

	public summarizePage = async (page: Page) => {
		if (!page.hasText()) return page

		return page
	}

	public summarizePages = async (pages: Array<Page>) => {
		const summarized_pages = await Promise.all(pages.map(this.summarizePage))

		return summarized_pages
	}
}
