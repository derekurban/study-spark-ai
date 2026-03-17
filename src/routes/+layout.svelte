<script lang="ts">
	import '../app.css'
	import { dev } from '$app/environment'
	import { inject } from '@vercel/analytics'
	import NProgress from 'nprogress'
	import 'nprogress/nprogress.css'
	import { invalidate } from '$app/navigation'
	import { onMount, setContext } from 'svelte'
	import { navigating } from '$app/stores'
	import { fade } from 'svelte/transition'
	import { checkTheme, toggleTheme } from '$lib/client/page-settings'
	import { supaSvelteStore } from '$lib/Sveltebase/SupaSvelteStore'
	import type { Database } from '$lib/database/types'

	inject({ mode: dev ? 'development' : 'production' })

	NProgress.configure({
		minimum: 0.6,
	})

	export let data

	let { supabase, session } = data
	$: ({ supabase, session } = data)

	setContext('session', session)

	let initial_loading = true

	$: {
		if ($navigating) {
			NProgress.start()
		} else {
			NProgress.done()
		}
	}

	onMount(() => {
		const theme = checkTheme()
		if (theme == 'light') toggleTheme()

		initial_loading = false
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth')
			}
		})

		return () => subscription.unsubscribe()
	})
</script>

{#if initial_loading}
	<div transition:fade class="w-screen h-screen flex justify-center items-center">
		<span class="loading loading-dots loading-lg" />
	</div>
{:else}
	<div transition:fade>
		<slot />
	</div>
{/if}
