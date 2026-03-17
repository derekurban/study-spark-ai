<script lang="ts">
	import { onMount } from 'svelte'
	import { writable } from 'svelte/store'
	import ColorPicker from './ColorPicker.svelte'
	import { getAllStudyContexts } from '$lib/client/clientContext'
	import { blurActiveElement, uuid } from '$lib/Utils/utils'
	import type { StudyTag } from '$lib/database/types'

	const { active_class_id, study_tags } = getAllStudyContexts()

	const tag_colors = [
		'#9d4242',
		'#9d7942',
		'#829d42',
		'#429d70',
		'#42729d',
		'#5d429d',
		'#9d4299',
		'#757575',
	]

	let modal: HTMLDialogElement

	$: tag_array = Array.from($study_tags.values())

	const addTag = async () => {
		await study_tags.upsert([
			{
				id: uuid(),
				class_id: $active_class_id,
				title: 'New Tag',
				color: '#757575',
			},
		])
	}

	const deleteTag = async (tag: StudyTag) => {
		await study_tags.delete(tag)
	}

	const saveTag = async (tag: StudyTag) => {
		if (!tag.title) return
		await study_tags.upsert([tag])
	}

	const resetFocus = () => {
		blurActiveElement(document)
	}

	const showModal = () => {
		modal.showModal()
		resetFocus()
	}

	const closeModal = () => modal.close()
</script>

<button class="btn w-full" on:click={showModal}><slot /></button>
<dialog bind:this={modal} class="modal">
	<div class="modal-box w-11/12 max-w-3xl">
		<div class="flex">
			<table class="table">
				<!-- head -->
				<thead>
					<tr>
						<th>Name</th>
						<th>Color</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					{#each tag_array as tag}
						<tr class="hover">
							<td>
								<input
									bind:value={tag.title}
									placeholder="Tag Name"
									on:change={() => saveTag(tag)}
								/>
							</td>
							<td>
								<ColorPicker
									colors={tag_colors}
									bind:active_color={tag.color}
									onChange={() => saveTag(tag)}
								/>
							</td>
							<td>
								<button class="btn" on:click={() => deleteTag(tag)}>
									<i class="fa-solid fa-trash-can" />
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<button class="btn w-full" on:click={addTag}>Add Tag</button>
	</div>
	<button class="modal-backdrop" on:click={closeModal} />
</dialog>
