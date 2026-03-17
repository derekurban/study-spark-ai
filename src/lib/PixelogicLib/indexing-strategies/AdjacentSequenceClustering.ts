import type TextEmbedder from '../embeddings/TextEmbedder'
import sentencize from '@stdlib/nlp-sentencize'
import type iLogger from '../interfaces/iLogger'
import { checkSimilarity } from '$lib/Utils/utils'
import Page from '../Page'
import Chunk from '../Chunk'

export default class AdjacentSequenceClustering {
	private text_embedder: TextEmbedder
	private similarity_threshold: number | undefined

	private logger?: iLogger
	constructor(
		text_embedder: TextEmbedder,
		options?: { similarity_threshold?: number; logger: iLogger },
	) {
		this.text_embedder = text_embedder
		this.similarity_threshold = options?.similarity_threshold ?? -1
		this.logger = options?.logger
	}

	public conformText = async (text: string) => {
		const TOKEN_LIMIT = this.text_embedder.getTokenLimit()
		const size = await this.text_embedder.countTokens(text)

		if (size > TOKEN_LIMIT) {
			const segments = text.split('\n')
			const middle = Math.floor(segments.length / 2)
			const left_half = segments.slice(0, middle).join('\n')
			const right_half = segments.slice(middle).join('\n')

			const left_size = await this.text_embedder.countTokens(text)
			const right_size = await this.text_embedder.countTokens(text)

			return [
				{ text: left_half, tokens: left_size },
				{ text: right_half, tokens: right_size },
			]
		} else {
			return [{ text, tokens: size }]
		}
	}

	public getAverageSimilarity = async (sentences: Array<string>) => {
		const conformed_sentences = await Promise.all(sentences.map((s1) => this.conformText(s1)))
		const embeddings = await Promise.all(
			([] as Array<{ text: string; tokens: number }>)
				.concat(...conformed_sentences)
				.map((s2) => this.text_embedder.generateEmbedding(s2.text)),
		)
		const similarities = embeddings.reduce<Array<number>>((res, _, index) => {
			if (index == 0) return res

			const similarity = checkSimilarity(embeddings[index], embeddings[index - 1])

			res.push(similarity)

			return res
		}, [])

		return similarities.reduce((sum, sim) => sum + sim, 0) / similarities.length
	}

	public getSentencesFromPage = (page: Page) => {
		return sentencize(page.getRawText())
	}

	public getClustersFromSentences = async (sentences: Array<{ text: string; tokens: number }>) => {
		let threshold = this.similarity_threshold
		if (!threshold) threshold = await this.getAverageSimilarity(sentences.map((tt) => tt.text))
		if (!threshold) throw Error('Adjacent Sequence Clustering Error: Threshold undefined')

		const sentence_embeddings: Array<Array<number>> = []
		for (let i = 0; i < sentences.length; i++) {
			const embedding = await this.text_embedder.generateEmbedding(sentences[i].text)
			sentence_embeddings.push(embedding)
		}

		const TOKEN_LIMIT = this.text_embedder.getTokenLimit()
		const clusters = sentences.reduce<Array<{ text: string; tokens: number }>>(
			(res, sentence, index) => {
				if (index == 0 || !threshold) return res

				const similarity = checkSimilarity(
					sentence_embeddings[index],
					sentence_embeddings[index - 1],
				)

				if (!sentence) return res

				if (similarity < threshold || res[res.length - 1].tokens + sentence.tokens > TOKEN_LIMIT) {
					res.push({
						text: sentence.text.trim(),
						tokens: sentence.tokens,
					})
				} else {
					res[res.length - 1].text += ' ' + sentence.text.trim()
					res[res.length - 1].tokens += sentence.tokens
				}

				return res
			},
			[sentences?.[0] ?? { text: '', tokens: 0 }],
		)

		return clusters.filter((c) => !!c)
	}

	public createChunkFromCluster = async (cluster: { text: string; tokens: number }) => {
		const embedding = await this.text_embedder.generateEmbedding(cluster.text)
		return new Chunk({ text: cluster.text, embedding })
	}

	public getChunksFromClusters = async (clusters: Array<{ text: string; tokens: number }>) => {
		const chunks = await Promise.all(clusters.map(this.createChunkFromCluster))
		return chunks
	}

	public chunkPages = async (pages: Array<Page>) => {
		this.logger?.info('Chunking Sentences')
		const sentences_by_page = pages.map((p) => this.getSentencesFromPage(p))

		const getConformedSentences = async (sentences: Array<string>) => {
			const conformed_sentences = await Promise.all(sentences.map((s) => this.conformText(s)))
			return ([] as Array<{ text: string; tokens: number }>).concat(...conformed_sentences)
		}

		const comformed_sentences_by_page = await Promise.all(
			sentences_by_page.map(getConformedSentences),
		)

		const clusters_by_page = await Promise.all(
			comformed_sentences_by_page.map(this.getClustersFromSentences),
		)

		const chunks_by_page = await Promise.all(clusters_by_page.map(this.getChunksFromClusters))

		if (chunks_by_page.length != pages.length)
			throw Error('Adjacent Sequence Clustering Error: Page length mismatch')

		this.logger?.info('Chunk Sentences')
		return chunks_by_page.map((chunks) => new Page({ chunks }))
	}
}
