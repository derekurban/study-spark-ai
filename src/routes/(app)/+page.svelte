<script lang="ts">
	import TagEditor from '$lib/components/TagEditor.svelte'
	import { onEnter } from '$lib/client/actions.js'
	import { getAllStudyContexts } from '$lib/client/clientContext'
	import type { StudyMaterial } from '$lib/database/types'
	import { blurActiveElement } from '$lib/Utils/utils'

	export let data
	let { supabase, session, study_class_id } = data
	$: ({ supabase, session, study_class_id } = data)

	const { active_class_id, active_class, study_materials } = getAllStudyContexts()

	$active_class_id = study_class_id ?? ''

	study_materials.get()

	$: study_materials_array = Array.from($study_materials.values()).filter(
		(m) => m.class_id == $active_class_id,
	)

	const saveDocument = async (study_material: StudyMaterial) => {
		const { status } = await study_materials.upsert([study_material])

		blurActiveElement(document)
	}

	const deleteDocument = async (study_material: StudyMaterial) => {
		const user_id = session?.user.id
		if (!user_id || !confirm('Are you sure you want to delete this document?')) return

		const file_path = `${user_id}/${study_material.id}.pdf`

		const { status } = await study_materials.delete(study_material)

		if (status) {
			const file_delete_call = await supabase.storage.from('documents').remove([file_path])
			if (file_delete_call.error) console.error(file_delete_call.error.message)
		}
	}
</script>

<div class="w-full max-w-7xl p-2.5">
	{#if $active_class}
		<div class="flex flex-col gap-3">
			<span class="text-3xl">
				{$active_class.title}
			</span>
			<div class="flex gap-5">
				<div class="flex-grow basis-1/3">
					<TagEditor>
						Edit {$active_class.title} tags
					</TagEditor>
				</div>
				<div class="flex-grow basis-1/3">
					<a class="btn w-full" href="/chat?class={$active_class.id}">
						Chat with {$active_class.title} lectures
					</a>
				</div>
				<div class="flex-grow basis-1/3">
					<a class="btn w-full" href="/upload?class={$active_class.id}">
						Upload Lecture to {$active_class.title}
					</a>
				</div>
			</div>
			{#each study_materials_array as study_material}
				<div class="card p-2 bg-base-300 flex flex-row items-center gap-2">
					<a class="flex-grow" href="/lecture?class={$active_class_id}&lecture={study_material.id}"
						>{study_material.title}</a
					>
					<div class="dropdown dropdown-bottom dropdown-end">
						<button class="btn">
							<i class="fa-solid fa-pen-to-square" />
						</button>
						<div class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
							<input
								class="w-full"
								bind:value={study_material.title}
								use:onEnter={() => saveDocument(study_material)}
								on:change={() => saveDocument(study_material)}
							/>
						</div>
					</div>
					<button class="btn" on:click={() => deleteDocument(study_material)}>
						<i class="fa-solid fa-trash-can" />
					</button>
				</div>
			{/each}
		</div>
	{:else}
		Select a class from the left hand panel
	{/if}
</div>
