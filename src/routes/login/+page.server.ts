import type { Provider } from '@supabase/supabase-js'
import { redirect, type Actions, fail } from '@sveltejs/kit'
import { NODE_ENV } from '$env/static/private'

const OAUTH_PROVIDERS = ['google']

export const actions: Actions = {
	login: async ({ locals, url }) => {
		const provider = url.searchParams.get('provider') as Provider

		if (provider) {
			if (!OAUTH_PROVIDERS.includes(provider))
				return fail(400, {
					error: 'Provider not supported.',
				})

			const params = provider == 'google' ? { prompt: 'select_account' } : undefined
			const redirectUrl = `${
				NODE_ENV == 'production'
					? url.origin
					: url.origin.replace('http://[::1]', 'http://localhost')
			}/api-deprecated/auth/callback`

			const { data, error } = await locals.supabase.auth.signInWithOAuth({
				provider: provider,
				options: {
					redirectTo: redirectUrl,
					queryParams: params,
				},
			})

			if (error) {
				return fail(400, {
					message: 'Something went wrong.',
				})
			} else {
				throw redirect(303, data.url)
			}
		}

		throw redirect(303, '/dashboard')
	},
}
