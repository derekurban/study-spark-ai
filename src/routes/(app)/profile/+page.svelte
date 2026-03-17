<script lang="ts">
	import { enhance } from '$app/forms'
	import { copyToClipboard } from '$lib/Utils/utils.js'
	import { getAllStudyContexts } from '$lib/client/clientContext.js'
	import type { FriendInClass, Profile } from '$lib/database/types.js'

	export let data
	let { friend_invite_link, friends } = data
	$: ({ friend_invite_link, friends } = data)

	const { study_classes, friends_in_classes } = getAllStudyContexts()

	friends_in_classes.get()

	$: study_classes_array = Array.from($study_classes.values())
	$: friend_ids_by_class = Array.from($friends_in_classes.values()).reduce((res, f_in_c) => {
		if (!res.has(f_in_c.class_id)) res.set(f_in_c.class_id, [])
		res.get(f_in_c.class_id)?.push(f_in_c.friend_id)
		return res
	}, new Map<string, Array<string>>())

	$: friends_by_class = study_classes_array.reduce((res, c) => {
		const friend_ids = friend_ids_by_class.get(c.id) ?? []
		const profiles = friends.filter((f) => friend_ids.includes(f.id))

		res.set(c.id, profiles)
		return res
	}, new Map<string, Array<Profile>>())

	const getFriendsFromClass = (class_id: string) => {
		const friend_ids = friends_by_class.get(class_id) ?? []
		return friends.filter((f) => friend_ids.includes(f.id))
	}

	const copyLinkToClipboard = () => {
		if (!friend_invite_link) return
		copyToClipboard(friend_invite_link)
	}

	const addFriendToClass = async (class_id: string, friend_id: string) => {
		await friends_in_classes.upsert([
			{
				class_id,
				friend_id,
			},
		])
	}

	const removeFriendFromClass = async (class_id: string, friend_id: string) => {
		const f_in_c = $friends_in_classes.get(`${class_id}#${friend_id}`)
		if (!f_in_c) return
		await friends_in_classes.delete(f_in_c)
	}
</script>

<div class="flex flex-col gap-5 p-5">
	Profile Screen

	<div class="card bg-base-200 p-3 flex flex-col">
		<span class="text-lg">Friends</span>
		<ul class="list-disc ml-5">
			{#each friends as friend}
				<li class="my-1">
					{friend.username}
				</li>
			{/each}
		</ul>
		<div class="flex">
			{#if friend_invite_link}
				<input
					type="text"
					disabled
					placeholder="Generate a Friend Invite Link"
					bind:value={friend_invite_link}
					class="input input-bordered w-full max-w-xs"
				/>
				<button
					disabled={!friend_invite_link}
					class="btn bg-base-100"
					on:click={copyLinkToClipboard}
				>
					<i class="fa-solid fa-copy" />
				</button>
			{:else}
				<form method="POST" action="?/generate_friend_invite" use:enhance>
					<button class="btn bg-base-100">Generate Friend Invite Link</button>
				</form>
			{/if}
		</div>
	</div>
	<div class="flex flex-wrap gap-5">
		{#each study_classes_array as study_class}
			<div class="card bg-base-200 p-3 flex flex-col">
				<span class="text-lg">Friends in {study_class.title}</span>

				<ul class="list-disc ml-5">
					{#each friends_by_class.get(study_class.id) ?? [] as friend}
						<li class="my-1">
							{friend.username}
							<button on:click={() => removeFriendFromClass(study_class.id, friend.id)}
								>Remove</button
							>
						</li>
					{/each}
				</ul>
				<div class="dropdown">
					<button class="btn m-1">Add Friend</button>
					<div class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
						{#each friends as friend}
							<button
								class="btn btn-ghost"
								on:click={() => addFriendToClass(study_class.id, friend.id)}
								>{friend.username}</button
							>
						{/each}
					</div>
				</div>
			</div>
		{/each}
	</div>
</div>
