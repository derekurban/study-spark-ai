<script lang="ts">
	// @ts-ignore
	import * as pdfjs from 'pdfjs-dist/build/pdf'
	// @ts-ignore
	import { pdfjsWorker } from 'pdfjs-dist/build/pdf.worker'
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

	let document_name = ''
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
		if (!file_to_upload || !document_name || !$active_class_id) return

		uploading = true

		const formData = new FormData()
		formData.append('file', file_to_upload)
		formData.append('name', document_name)
		formData.append('class_id', $active_class_id)

		const response = await fetch('/api/rag/indexing', {
			method: 'POST',
			body: formData,
		})

		study_classes.get()
		study_materials.get()

		uploading = false
		goto(`/?class=${$active_class_id}`)
	}
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
	<input bind:value={document_name} placeholder="Document Name" />
	{#if uploading}
		<button class="btn bg-primary" disabled>
			<span class="loading loading-infinity loading-md" />
			Uploading
		</button>
	{:else}
		<button
			disabled={!file_to_upload || !document_name || !$active_class_id}
			class="btn bg-primary"
			type="button"
			on:click={uploadDocument}>Upload Document</button
		>
	{/if}
	<!-- <div class="max-w-xs" style="display: {$pdf_store.instance ? 'none' : ''}">
		<span class="label-text">Upload your lecture content</span>
		<input
			disabled={$pdf_store.loading}
			type="file"
			class="file-input file-input-bordered w-full max-w-xs"
			accept=".pdf"
			placeholder="Upload Lecture"
			on:change={loadFile}
		/>
		{#if $pdf_store.loading}
			<span class="label-text">Uploading file...</span>
		{/if}
	</div>
	<div style="display: {$pdf_store.instance ? '' : 'none'}">
		<div class="flex gap-3 pb-3 items-center">
			<span class="text-xl">{$active_class?.title}: </span>
			<input
				class="flex-grow"
				type="text"
				disabled={uploading_lecture}
				bind:value={$pdf_store.name}
				placeholder="Lecture Name"
			/>
		</div>
		{#if $pdf_store.file}
			<PdfViewer file={$pdf_store.file} {onChangePage} onLoad={onPdfLoad} />
		{/if}
		<div class="flex justify-between py-3 gap-20">
			<p>Page {$pdf_store.page} of {$pdf_store.total_pages}</p>

			<div class="flex flex-wrap gap-3">
				{#if !uploading_lecture}
					{#each tag_array as tag}
						<button
							class="btn border-2"
							style="border-color: {tag.color}; background-color: {current_page_tags.includes(
								tag.id,
							)
								? tag.color
								: 'transparent'};"
							on:click={() => toggleTag(tag)}
						>
							{tag.title}
						</button>
					{/each}
					<div class="w-min">
						<TagEditor>Edit Tags</TagEditor>
					</div>
				{/if}
			</div>
		</div>
		<div class="flex justify-end">
			{#if uploading_lecture}
				<button class="btn bg-primary" disabled>
					<span class="loading loading-infinity loading-md" />
					Uploading
				</button>
			{:else}
				<button class="btn bg-primary" type="button" on:click={uploadLecture}>Upload Lecture</button
				>
			{/if}
		</div>
	</div> -->
</div>
