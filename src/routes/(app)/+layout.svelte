<script lang="ts">
	import { goto } from '$app/navigation'
	import { onEnter } from '$lib/client/actions'
	import type { PageData } from './$types'
	import { getAllStudyContexts, initStudyContext } from '$lib/client/clientContext'
	import type { StudyClass } from '$lib/database/types'
	import { blurActiveElement, uuid } from '$lib/Utils/utils'
	import NotificationManager from '$lib/components/NotificationManager.svelte'
	export let data: PageData

	let { supabase, session } = data
	$: ({ supabase, session } = data)

	const notifications = [
		{
			message: 'Test Alert',
		},
	]

	initStudyContext(supabase)

	const { active_class_id, study_classes, study_materials } = getAllStudyContexts()

	study_classes.get()

	$: study_classes_array = Array.from($study_classes.values())

	const selectClass = (study_class: StudyClass) => {
		$active_class_id = study_class.id
		goto(`/?class=${study_class.id}`)
	}

	const saveClass = async (study_class: StudyClass) => {
		const { status } = await study_classes.upsert([study_class])

		blurActiveElement(document)
	}

	const deleteClass = async (study_class: StudyClass) => {
		if (!confirm('Are you sure you want to delete this class?')) return

		const { status } = await study_classes.delete(study_class)

		if (status) {
			study_materials.get()
		}
	}

	const createClass = async () => {
		const { status } = await study_classes.insert([
			{
				id: uuid(),
				title: 'New Class',
			},
		])
	}
</script>

<div class="w-screen h-screen">
	<div class="drawer drawer-open">
		<input id="my-drawer-2" type="checkbox" class="drawer-toggle" />
		<div class="drawer-content">
			<slot />
		</div>
		<div class="drawer-side">
			<div class="menu p-4 w-80 min-h-full bg-base-200 text-base-content flex flex-col">
				<span class="text-xl">Classes</span>
				{#each study_classes_array as study_class}
					<div class="card p-2 bg-base-300 flex flex-row items-center gap-2">
						<button class="flex-grow" on:click={() => selectClass(study_class)}>
							{study_class.title}</button
						>
						<div class="dropdown dropdown-bottom dropdown-end">
							<button class="btn">
								<i class="fa-solid fa-pen-to-square" />
							</button>
							<div class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
								<input
									class="w-full"
									bind:value={study_class.title}
									use:onEnter={() => saveClass(study_class)}
									on:change={() => saveClass(study_class)}
								/>
							</div>
						</div>
						<button class="btn" on:click={() => deleteClass(study_class)}>
							<i class="fa-solid fa-trash-can" />
						</button>
					</div>
				{/each}
				<button class="btn w-full bg-base-100" on:click={createClass}> New Class </button>
				<div class="flex flex-grow items-end">
					<a href="/test" class="btn bg-base-100 w-full">Test</a>
				</div>
				<div class="flex flex-grow items-end">
					<a class="btn bg-base-100" href="/profile">
						<i class="fa-solid fa-user" />
					</a>
					<form class="w-full" method="post" action="/api-deprecated/auth/signout">
						<button class="btn bg-base-100 w-full">Log out</button>
					</form>
				</div>
			</div>
		</div>
	</div>
	<NotificationManager />
</div>
