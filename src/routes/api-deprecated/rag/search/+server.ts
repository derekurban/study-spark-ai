import { PRIVATE_OPENAI_API_KEY } from '$env/static/private'
import ChatGptHandler, { type ChatGptMessage } from '$lib/PixelogicOpenAi/ChatGptHandler'
import { pipeline } from '@xenova/transformers'
import type { RequestHandler } from './$types'

const gptHandler = new ChatGptHandler(PRIVATE_OPENAI_API_KEY)

export const POST: RequestHandler = async ({ request, locals: { supabase } }) => {
	const { prompt, class_id }: { prompt: string; class_id: string } = await request.json()

	// const prompt = `Into which word parts is the term levoversion broken down?
	// You have the following multiple choice options:
	// A) base-base-combining vowel-suffix
	// B) base-combining vowel-base-suffix
	// C) prefix-combining vowel-base-suffix
	// D) base-base-suffix`

	const keyword_messages: Array<ChatGptMessage> = [
		{
			role: 'system',
			content: `As an AI system, you are required to deeply analyze each query and extract all unique elements mentioned within. 
			These elements can encompass the main subject of the query, sub-topics, contextual clues, specified arguments, individual key-words or phrases, etc. 
			Regardless of the format of the query, your role is to identify and categorize these distinct elements. 
			The elements identified should have more information behind it, avoid including trivial words, phrases or information.
			This best ensures a whole and accurate understanding of the query to give superior and thorough responses.
			VERY RARELY SHOULD YOUR RESPONSE CONTAIN ONLY ONE MENTION, IT IS RARE THAT A QUERY IS THAT SIMPLE.`,
		},
		{
			role: 'user',
			content: prompt,
		},
	]

	const keyword_response = await gptHandler.chatCompletion({
		model: 'gpt-3.5-turbo',
		messages: keyword_messages,
		temperature: 0.1,
		function_call: { name: 'mentioned_information' },
		functions: [
			{
				name: 'mentioned_information',
				description: 'Takes in a list of all the mentioned information',
				parameters: {
					type: 'object',
					properties: {
						mentions: {
							type: 'array',
							items: {
								type: 'string',
								description: 'A mentioned "thing"',
							},
							description: 'A list of mentions',
						},
					},
					required: ['mentions'],
				},
			},
		],
	})

	const mentions =
		JSON.parse(keyword_response.choices[0].message.function_call?.arguments ?? '{}')?.mentions ?? []

	const keyword_messages2: Array<ChatGptMessage> = [
		{
			role: 'system',
			content: `As an AI system, you are required to deeply analyze an original query and list of mentions.
			You then take into consideration the intent of the original query and use the list of mentions to generate revised queries.
			Each revised query should be carefully constructed to find more information that will be used to holistically answer the original query.
			You are very bad with remembering things however and should not attempt to draw upon your own memory to construct these queries.
			If a revised query contains mentions/references to something not present in the original prompt or mention list OMIT THAT QUERY IMMEDIATELY.
			`,
		},
		{
			role: 'user',
			content: `original prompt: "${prompt}"
			mentions: "${mentions}"`,
		},
	]

	const keyword_response2 = await gptHandler.chatCompletion({
		model: 'gpt-3.5-turbo',
		messages: keyword_messages2,
		temperature: 0.1,
		function_call: { name: 'revised_queries' },
		functions: [
			{
				name: 'revised_queries',
				description: 'Takes in a list of revised queries to gather more information/context',
				parameters: {
					type: 'object',
					properties: {
						queries: {
							type: 'array',
							items: {
								type: 'string',
								description: 'A revised query with the goal of finding more information/context',
							},
							description:
								'A list of revised queries, each being carefully crafted to find out more information/context',
						},
					},
					required: ['queries'],
				},
			},
		],
	})

	const revised_queries =
		JSON.parse(keyword_response2.choices[0].message.function_call?.arguments ?? '{}')?.queries ?? []

	const generateEmbedding = await pipeline('feature-extraction', 'Supabase/gte-small')

	const revised_query_embedding_data = await Promise.all(
		revised_queries.map((q: string) => {
			return generateEmbedding(q, {
				pooling: 'mean',
				normalize: true,
			})
		}),
	)

	const revised_query_embeddings = revised_query_embedding_data.map((d) => Array.from(d.data))

	const vector_search_data = await Promise.all(
		revised_query_embeddings.map((embedding) => {
			return supabase.rpc('match_chunk', {
				query_embedding: JSON.stringify(embedding), // Pass the embedding you want to compare
				match_threshold: 0.7, // Choose an appropriate threshold for your data
				match_count: 2, // Choose the number of matches
				class_id: class_id,
			})
		}),
	)

	const vector_search_documents = vector_search_data.reduce<
		Array<{ id: string; content: string; similarity: number }>
	>((accumulator, value) => accumulator.concat(value?.data ?? []), [])

	const keyword_search_data = await Promise.all(
		mentions.map((m: string) => {
			return supabase.rpc('match_chunk_kw', {
				query_text: m, // Pass the embedding you want to compare
				match_count: 2, // Choose the number of matches
				class_id: class_id,
			})
		}),
	)

	console.log(keyword_search_data)

	const keyword_search_documents = keyword_search_data.reduce<
		Array<{ id: string; content: string; similarity: number }>
	>((accumulator, value) => accumulator.concat(value?.data ?? []), [])

	console.log('\n******** [REVISED QUERIES] ********\n')
	console.log(revised_queries)
	console.log(vector_search_documents)
	console.log('\n*************************************\n')

	console.log('\n*********** [MENTIONS] ***********\n')
	console.log(mentions)
	console.log(keyword_search_documents)
	console.log('\n*************************************\n')

	const all_documents = vector_search_documents
		.concat(keyword_search_documents)
		.filter((v, i, a) => a.map((mapObj) => mapObj.id).indexOf(v.id) === i)

	const consultant_messages: Array<ChatGptMessage> = [
		{
			role: 'system',
			content: `As an AI system, you are required to deeply analyze each query and understand which information is needed to satisfy it.
			You have to deal with the following context's, each context has content and an associated ID.
			You're job is to understand which context's content can be used to satisfy the query, some of the context will be irrelevant, filter it out.
			You must ensure that the selected context id's are as holistic as possible and cover as much of the queries request as necessary.
			
			The context information you have is as follows:
			${JSON.stringify(all_documents)}

			You will then return the unique identifier number that is associated with the context provided.
			The uuid is in the form "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", where each x is a character
			`,
		},
		{
			role: 'user',
			content: prompt,
		},
	]

	const consultant_response = await gptHandler.chatCompletion({
		model: 'gpt-3.5-turbo-16k',
		messages: consultant_messages,
		temperature: 0.1,
		function_call: { name: 'consultation' },
		functions: [
			{
				name: 'consultation',
				description: 'Takes in a list of context uuids that are needed to satisfy a query',
				parameters: {
					type: 'object',
					properties: {
						context_ids: {
							type: 'array',
							items: {
								type: 'string',
								description: 'A context uuid',
							},
							description: 'A list of context uuids',
						},
					},
					required: ['context_ids'],
				},
			},
		],
	})

	const consulted_ids: Array<string> =
		JSON.parse(consultant_response.choices[0].message.function_call?.arguments ?? '{}')
			?.context_ids ?? []

	const consulted_documents = consulted_ids
		.map((id) => all_documents.find((d) => d.id == id))
		.filter((d) => !!d)

	console.log('\n*********** [CONSULTED] ***********\n')
	console.log(consulted_ids)
	console.log(consulted_documents)
	console.log('\n*************************************\n')

	console.log('Synthesizing Response')

	const synthesis_messages: Array<ChatGptMessage> = [
		{
			role: 'system',
			content: `You are a Response Synthesizer, your job is to understand the incoming query and use all of the context provided to answer it thouroughly.
			This job requires you to respond with three things for every incoming query.
			1. The response in an explanatory manner used to fully satisfy the incoming request
			2. The list of context uuid's that you used when synthesizing your response
			3. The pieces of information that weren't provided which you used to synthesize your response in great detail.

			It is vital that you use as much of the content from the provided context to synthesize your response.
			It is vital that if you use supplementary information from your own memory (not in the context provided), you keep track of it include it in your response.

			Here is the context you have to work with for the incoming query:
			${JSON.stringify(consulted_documents)}
			`,
		},
		{
			role: 'user',
			content: prompt,
		},
	]

	const synthesis_response = await gptHandler.chatCompletion({
		model: 'gpt-4',
		messages: synthesis_messages,
		temperature: 0.5,
		function_call: { name: 'synthesized_response' },
		functions: [
			{
				name: 'synthesized_response',
				description: 'Takes in a synthesized response, a list of context_ids, and a list of facts',
				parameters: {
					type: 'object',
					properties: {
						response: {
							type: 'string',
							description:
								'The synthesized response in natural language that contains all the necessary information to satisfy the query. Without any new lines or carriage return characters.',
						},
						context_ids: {
							type: 'array',
							items: {
								type: 'string',
								description: 'A context uuid',
							},
							description: 'A list of context uuids used in synthesizing a response',
						},
						untrusted_info: {
							type: 'array',
							items: {
								type: 'string',
								description: 'A piece of untrusted information used in satisfying a query query',
							},
							description: 'A list of unstrusted info that was used to fully satisfy a query',
						},
					},
					required: ['response', 'context_ids', 'untrusted_info'],
				},
			},
		],
	})

	const synthesized_response = JSON.parse(
		synthesis_response.choices[0].message.function_call?.arguments ?? '{}',
	)

	const gpt_4_prompt_cost = synthesis_response.usage.prompt_tokens * (0.03 / 1000)
	const gpt_4_completion_cost = synthesis_response.usage.completion_tokens * (0.06 / 1000)

	const gpt_3_prompt_cost =
		(keyword_response.usage.prompt_tokens +
			keyword_response2.usage.prompt_tokens +
			consultant_response.usage.prompt_tokens) *
		(0.0015 / 1000)
	const gpt_3_completion_cost =
		(keyword_response.usage.completion_tokens +
			keyword_response2.usage.completion_tokens +
			consultant_response.usage.completion_tokens) *
		(0.002 / 1000)

	console.log(`GPT-3.5 Cost: $${gpt_3_prompt_cost + gpt_3_completion_cost}`)
	console.log(`GPT-4 Cost: $${gpt_4_prompt_cost + gpt_4_completion_cost}`)

	console.log(
		`Previous Cost: $${
			consultant_response.usage.prompt_tokens * (0.03 / 1000) +
			synthesis_response.usage.completion_tokens * (0.06 / 1000)
		}`,
	)

	console.log(
		`Total New Cost: $${
			gpt_3_prompt_cost + gpt_3_completion_cost + gpt_4_prompt_cost + gpt_4_completion_cost
		}`,
	)

	return new Response(JSON.stringify(synthesized_response))
}
