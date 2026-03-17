import type { StreamingTextResponse } from 'ai'

export default class StreamReceiver {
	public async processStream(
		reader: ReadableStreamDefaultReader,
		handler: (readValue: () => Promise<{ value: string; done: boolean }>) => Promise<void>,
	) {
		const textDecoder = new TextDecoder()
		const readValue = async () => {
			const { done, value } = await reader.read()

			return { done, value: done ? '' : textDecoder.decode(value) }
		}
		await handler(readValue)
	}

	public getReaderFromResponse(
		streamResponse: StreamingTextResponse,
	): ReadableStreamDefaultReader<Uint8Array> | undefined {
		if (!streamResponse || typeof streamResponse !== 'object' || !streamResponse.body)
			return undefined

		// Ensure the response is okay
		if (!streamResponse.ok) return undefined

		return streamResponse.body.getReader()
	}
}
