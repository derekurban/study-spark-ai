<script lang="ts">
	import { enhance } from '$app/forms'
	import type { PageData } from './$types'

	export let data: PageData
	let { invite, invite_user } = data
	$: ({ invite, invite_user } = data)
</script>

<div>
	Invite from {invite_user.username}
	<form
		method="POST"
		action="?/accept"
		use:enhance={({ formData }) => {
			formData.set('invite_id', invite.id)
			return async ({ update }) => {
				await update()
			}
		}}
	>
		<button>Test</button>
	</form>
</div>
