import { redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'

export const load = (async ({ url }) => {
	const class_id = url.searchParams.get('class')
	const lecture_id = url.searchParams.get('lecture')
	if (!class_id || !lecture_id) throw redirect(302, '/')

	const page = url.searchParams.get('page')
	return {
		lecture_id,
		current_page: page ? parseInt(page) : undefined,
	}
}) satisfies PageServerLoad
