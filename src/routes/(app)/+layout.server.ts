import type { LayoutServerLoad } from './$types'

export const load = (async ({ url }) => {
	const study_class_id = url.searchParams.get('class')
	return {
		study_class_id,
	}
}) satisfies LayoutServerLoad
