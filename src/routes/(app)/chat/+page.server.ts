import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load = (async ({ url }) => {
	const class_id = url.searchParams.get('class')
	if (!class_id) throw redirect(302, '/')
	return {}
}) satisfies PageServerLoad
