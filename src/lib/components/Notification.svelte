<script lang="ts">
	import type { Notification } from '$lib/client/NotificationHandler'
	import { createEventDispatcher } from 'svelte'
	import { slide } from 'svelte/transition'

	const dispatch = createEventDispatcher()

	export let notification: Notification
	export let sub_text: string | undefined = undefined

	const setIcon = () => {
		switch (notification.type) {
			case 'success':
				return 'fa-solid fa-circle-check'
			case 'warning':
				return 'fa-solid fa-triangle-exclamation'
			case 'error':
				return 'fa-solid fa-circle-xmark'
			case 'info':
				return 'fa-solid fa-circle-info'
		}
		return 'fa-solid fa-envelope'
	}

	const icon = setIcon()

	let progress = 100
	if (notification.seconds) {
		const startTime = Date.now()
		const endTime = startTime + notification.seconds * 1000

		const clockInterval = setInterval(() => {
			const currentTime = Date.now()

			if (currentTime >= endTime) {
				clearTimeout(clockInterval)
				progress = 0 // Time is up, so progress is 0%
				dispatch('finished', notification.id)
			} else {
				const timeElapsed = currentTime - startTime
				const totalDuration = endTime - startTime
				progress = 100 - (timeElapsed / totalDuration) * 100 // Calculate remaining time percentage
			}
		}, 50)
	}
</script>

<div
	transition:slide={{ duration: 250 }}
	role="alert"
	class="relative alert alert-{notification.type} pr-8"
>
	{#if icon}
		<i class={icon} />
	{/if}
	<div>
		<h3 class="font-bold">{notification.message}</h3>
		{#if notification.sub_message}
			<div class="text-xs">{notification.sub_message}</div>
		{:else if sub_text}
			<div class="text-xs">{sub_text}</div>
		{/if}
	</div>
	{#if notification.seconds}
		<div
			class="absolute top-2 right-2 radial-progress"
			style="--value:{progress}; --size:15px; --thickness:3px;"
			role="progressbar"
		/>
	{:else}
		<button class="absolute top-1 right-2" on:click={() => dispatch('finished', notification.id)}>
			<i class="fa-solid fa-xmark text-lg" />
		</button>
	{/if}
	{#if notification.callback}
		<button on:click={notification.callback}>
			<i class="fa-solid fa-arrow-right-to-bracket text-xl" />
		</button>
	{/if}
</div>
