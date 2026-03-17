import { PRIVATE_OPENAI_API_KEY } from '$env/static/private'
import type { RequestHandler } from '@sveltejs/kit'
import ChatGptHandler, { type ChatGptMessage } from '$lib/PixelogicOpenAi/ChatGptHandler'
import { writable } from 'svelte/store'
import { Configuration, OpenAIApi } from 'openai-edge'
import { OpenAIStream } from 'ai'

export const config = {
	runtime: 'edge',
}

const gptHandler = new ChatGptHandler(PRIVATE_OPENAI_API_KEY)

export const POST: RequestHandler = async ({ request }) => {
	// Extract the `messages` from the body of the request
	const { messages }: { messages: Array<ChatGptMessage> } = await request.json()

	return await gptHandler.streamChatCompletion({
		model: 'gpt-3.5-turbo',
		messages,
	})
}
