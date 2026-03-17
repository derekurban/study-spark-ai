<script lang="ts">
	// @ts-ignore
	import * as pdfjs from 'pdfjs-dist/build/pdf'
	// @ts-ignore
	import { pdfjsWorker } from 'pdfjs-dist/build/pdf.worker'
	import { marked } from 'marked'
	import { writable } from 'svelte/store'
	import { goto } from '$app/navigation'
	import { getAllStudyContexts } from '$lib/client/clientContext.js'

	pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

	export let data
	let { supabase, session } = data
	$: ({ supabase, session } = data)

	const { active_class_id, study_classes, study_materials } = getAllStudyContexts()

	let current_page_tags: Array<string> = []
	$: {
		if (!$pdf_store.tags_by_page.has($pdf_store.page))
			$pdf_store.tags_by_page.set($pdf_store.page, [])
		current_page_tags = $pdf_store.tags_by_page.get($pdf_store.page) ?? []
	}

	let markdown: string = ''

	const DEFAULT_PDF_STORE = {
		file: null,
		name: 'New Lecture',
		tags_by_page: new Map<number, Array<string>>(),
		instance: undefined,
		page: 1,
		total_pages: 0,
		height: 0,
		width: 0,
		loading: false,
	}
	let pdf_store = writable<{
		file: File | null
		name: string
		tags_by_page: Map<number, Array<string>>
		instance: any
		page: number
		total_pages: number
		height: number
		width: number
		loading: boolean
	}>(DEFAULT_PDF_STORE)

	let file_to_upload: File | undefined
	let uploading = false
	const onFileInput = (event: Event) => {
		const target = event.target as HTMLInputElement
		if (!target || !target.files || target.files.length == 0) return
		if (target.files.length > 1) {
			throw Error('Can only upload one file')
		}
		file_to_upload = target.files[0]
	}

	const uploadDocument = async () => {
		if (!file_to_upload) return

		uploading = true

		const formData = new FormData()
		formData.append('file', file_to_upload)

		const response = await fetch('/api/rag/indexing', {
			method: 'POST',
			body: formData,
		})

		console.log(response)

		const body = await response.json()

		markdown = body.markdown

		study_classes.get()
		study_materials.get()

		uploading = false
	}

	$: markdownContent = marked(markdown)
</script>

<div class="w-full max-w-7xl p-5 flex flex-col gap-3">
	<a class="btn w-min" href="/?class={$active_class_id}"><i class="fa-solid fa-arrow-left" /></a>
	<div class="max-w-xs">
		<span class="label-text">Upload your document</span>
		<input
			disabled={uploading}
			type="file"
			class="file-input file-input-bordered w-full max-w-xs"
			accept=".pdf"
			placeholder="Upload Document"
			on:change={onFileInput}
		/>
		{#if uploading}
			<span class="label-text">Uploading file...</span>
		{/if}
	</div>
	{#if uploading}
		<button class="btn bg-primary" disabled>
			<span class="loading loading-infinity loading-md" />
			Uploading
		</button>
	{:else}
		<button
			disabled={!file_to_upload}
			class="btn bg-primary"
			type="button"
			on:click={uploadDocument}>Upload Document</button
		>
	{/if}

	<div class="markdown">
		{@html markdownContent}
	</div>
</div>
