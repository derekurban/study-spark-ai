<script lang="ts">
	import { notification_handler } from '$lib/client/NotificationHandler'
	import { fade } from 'svelte/transition'
	import Notification from './Notification.svelte'

	$: notifications = $notification_handler
	$: top_3_notifs = notifications.slice(0, 3).reverse()
	$: hidden_notifications = notifications.length - 3 > 0 ? notifications.length - 3 : 0
</script>

<div class="fixed p-5 right-0 top-0 flex flex-col gap-3">
	{#each top_3_notifs as notification, index (notification.id)}
		{#if index == 0 && hidden_notifications > 0}
			<Notification
				{notification}
				sub_text={`You have ${hidden_notifications} more notifications`}
				on:finished={(e) => notification_handler.dequeue(e.detail)}
			/>
		{:else}
			<Notification {notification} on:finished={(e) => notification_handler.dequeue(e.detail)} />
		{/if}
	{/each}
</div>
