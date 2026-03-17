<script lang="ts">
	import { getAllStudyContexts } from '$lib/client/clientContext.js'
	import PdfViewer from '$lib/components/PDFViewer.svelte'
	import type { StudyMaterial } from '$lib/database/types.js'

	export let data
	let { supabase, session, lecture_id, current_page } = data
	$: ({ supabase, session, lecture_id, current_page } = data)

	const { active_class_id, active_class, study_materials } = getAllStudyContexts()

	$: lecture = $study_materials.get(lecture_id)

	let previous_lecture_id = ''
	$: {
		if (lecture) {
			if (previous_lecture_id !== lecture.id) getFile(lecture)
			previous_lecture_id = lecture.id ?? ''
		}
	}

	let pdf_file: File | undefined = undefined
	const getFile = async (study_material: StudyMaterial) => {
		const { data, error } = await supabase.storage
			.from('documents')
			.download(study_material.file_path)
		if (error) throw new Error(error.message)

		pdf_file = new File([data], study_material.id + '.pdf')
	}
</script>

<div class="w-full max-w-7xl p-5 flex flex-col gap-3">
	<a class="btn w-min" href="/?class={$active_class_id}"><i class="fa-solid fa-arrow-left" /></a>

	{#if pdf_file}
		<PdfViewer file={pdf_file} {current_page} />
	{/if}
</div>
