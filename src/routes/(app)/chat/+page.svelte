<script lang="ts">
	import { onEnter, resizeTextarea } from '$lib/client/actions.js'
	import ChatGptReceiver from '$lib/PixelogicOpenAi/ChatGptReceiver.js'
	import { callFetch } from '$lib/client/fetchHandler.js'
	import type { StreamingTextResponse } from 'ai'
	import StreamJsonTokenizer from '$lib/PixelogicHelpers/StreamJsonTokinzer.js'
	import { getAllStudyContexts } from '$lib/client/clientContext.js'
	import { onMount } from 'svelte'

	export let data
	let { supabase, session, study_class_id } = data
	$: ({ supabase, session, study_class_id } = data)
	const { active_class_id, active_class, study_materials, study_chunks, study_chapters } =
		getAllStudyContexts()
	$active_class_id = study_class_id ?? ''
	study_chunks.get()
	study_chapters.get()
	study_materials.get()

	let user_prompt = ''
	let cached_user_prompt: string | undefined = undefined
	let gpt_response:
		| {
				response: string
				context_ids: Array<string>
				untrusted_info: Array<string>
		  }
		| undefined = undefined

	const chat_gpt_receiver = new ChatGptReceiver()
	const stream_json_tokenizer = new StreamJsonTokenizer()
	let sending_query = false
	let cancel_request: (() => Promise<void>) | undefined = undefined
	const submitQuery = async () => {
		if (!$active_class_id) return
		if (cancel_request) {
			await cancel_request()
			cancel_request = undefined
		}

		sending_query = true
		const search_response = await callFetch('/api/rag/search', {
			method: 'POST',
			body: {
				prompt: user_prompt,
				class_id: $active_class_id,
			},
		})

		if (!search_response || !search_response.ok) {
			sending_query = false
			return
		}

		const {
			response,
			context_ids,
			untrusted_info,
		}: { response: string; context_ids: Array<string>; untrusted_info: Array<string> } =
			await search_response?.json()

		gpt_response = {
			response: response,
			context_ids: context_ids,
			untrusted_info: untrusted_info,
		}

		cached_user_prompt = user_prompt
		user_prompt = ''
		sending_query = false
	}

	const getReferenceFromChunk = (chunk_id: string) => {
		let chunk = $study_chunks.get(chunk_id)
		if (!chunk) return
		let chapter = $study_chapters.get(chunk.chapter_id)
		if (!chapter) return
		let doc = $study_materials.get(chapter.material_id)
		if (!doc) return
		return { document_id: doc.id, page_num: chapter.page_num, title: doc.title }
	}
</script>

<div class="w-full max-w-7xl p-5 flex flex-col gap-3">
	<div class="w-full flex gap-5 items-center">
		<a class="btn w-min" href="/?class={$active_class_id}"><i class="fa-solid fa-arrow-left" /></a>
		<span class="text-2xl">
			{$active_class?.title}
			<span class="bg-gradient-primary-accent"> SparkChat </span>
		</span>
	</div>
	<div class="flex flex-col gap-5">
		<div class="card bg-base-200 p-5">
			<span class="text-lg bg-gradient-primary-secondary w-fit">Query:</span>
			<div class="mx-5 mt-3 flex flex-col gap-5">
				{#if sending_query}
					<p>
						"{user_prompt}"
					</p>
				{:else}
					<p>
						"{cached_user_prompt ?? 'Type in the chat box to send a query!'}"
					</p>
				{/if}
			</div>
		</div>
		<div class="card bg-base-200 p-5">
			<span class="text-lg bg-gradient-primary-accent w-fit">SparkChat:</span>
			<div class="mx-5 mt-3 flex flex-col gap-5">
				{#if sending_query}
					<div class="flex gap-1">
						<span class="loading loading-infinity loading-sm" /> Synthesizing Response...
					</div>
				{:else if gpt_response}
					<p>
						"{gpt_response.response}"
					</p>
					{#if gpt_response.context_ids.length > 0}
						<div class="flex flex-col gap-1">
							<span class="text-sm">I used the following material to generate my response:</span>
							<div class="card bg-base-300 p-3">
								<ul class="list-disc ml-5">
									{#each gpt_response.context_ids as id}
										<li class="my-1">
											{#if getReferenceFromChunk(id)}
												<a
													class="flex gap-3"
													href="/lecture?class={$active_class_id}&lecture={getReferenceFromChunk(id)
														?.document_id}&page={getReferenceFromChunk(id)?.page_num}"
													target={getReferenceFromChunk(id)?.document_id ?? '_blank'}
												>
													<span>{getReferenceFromChunk(id)?.title ?? 'Unnamed Lecture'}</span>
													<span>p.{getReferenceFromChunk(id)?.page_num ?? 'Missing Page'}</span>
												</a>
											{:else}
												<div class="flex gap-3">
													<div class="flex gap-3 items-center">
														<span class="loading loading-infinity loading-sm" />
														Finding Lecture & Page number
													</div>
												</div>
											{/if}
										</li>
									{/each}
								</ul>
							</div>
						</div>
					{/if}
					{#if gpt_response.untrusted_info.length > 0}
						<div class="flex flex-col gap-1">
							<span class="text-sm">I used the following information from memory (untrusted):</span>
							<div class="card bg-base-300 p-3">
								<ul class="list-disc ml-5">
									{#each gpt_response.untrusted_info as info}
										<li class="my-1">
											<p>{info}</p>
										</li>
									{/each}
								</ul>
							</div>
						</div>
					{/if}
				{:else}
					<p>
						"Feel free to ask me anything about {$active_class?.title ?? 'Unknown Class'} Content!"
					</p>
				{/if}
			</div>
		</div>
	</div>

	<textarea use:resizeTextarea bind:value={user_prompt} use:onEnter={submitQuery} />
	<div class="flex justify-end gap-3">
		{#if sending_query}
			<button disabled class="btn">
				<span class="loading loading-infinity loading-md" /> Sending
			</button>
		{:else}
			<button class="btn" on:click={submitQuery}> Send </button>
		{/if}
	</div>
</div>
