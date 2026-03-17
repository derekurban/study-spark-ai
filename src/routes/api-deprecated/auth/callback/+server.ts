import { redirect } from '@sveltejs/kit'

export const GET = async ({ url, locals: { supabase } }) => {
	const code = url.searchParams.get('code')

	if (code) {
		const res = await supabase.auth.exchangeCodeForSession(code)
	}

	//API call to Python endpoint with the session code

	throw redirect(302, '/')
}
