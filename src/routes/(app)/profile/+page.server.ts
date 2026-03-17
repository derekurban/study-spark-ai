import type { Provider } from '@supabase/supabase-js'
import { redirect, type Actions, fail, error } from '@sveltejs/kit'

import type { PageServerLoad } from './$types'
import type { Profile } from '$lib/database/types'

export const load = (async ({ url, locals: { getSession, supabase } }) => {
	const session = await getSession()
	const user_id = session?.user.id

	if (!user_id) throw error(404, 'Invalid User Id')

	const friend_call = await supabase.from('friends_with').select('*, profile(*)')
	if (friend_call.error) throw error(404, `${friend_call.error.code}: ${friend_call.error.message}`)

	const friends = friend_call.data.reduce<Array<Profile>>((res, d) => {
		if (d.profile) res.push(d.profile)
		return res
	}, [])

	const friend_invite_call = await supabase.from('invite_link').select('*').eq('type', 'friend')
	if (friend_invite_call.error)
		throw error(404, `${friend_invite_call.error.code}: ${friend_invite_call.error.message}`)

	const friend_invite = friend_invite_call.data?.[0]
	const friend_invite_link = friend_invite
		? url.host + `/invite?invite_id=${friend_invite.id}`
		: undefined

	return { friend_invite_link, friends }
}) satisfies PageServerLoad

export const actions: Actions = {
	add_friend_to_class: async ({ locals: { supabase, getSession }, url }) => {
		console.log('test')
	},
	generate_friend_invite: async ({ locals: { supabase, getSession }, url }) => {
		const session = await getSession()
		const user_id = session?.user.id

		if (!user_id) throw error(404, 'Invalid User Id')

		const friend_invite_call = await supabase.from('invite_link').insert({
			resource_id: user_id,
			type: 'friend',
		})
		if (friend_invite_call.error)
			throw error(404, `${friend_invite_call.error.code}: ${friend_invite_call.error.message}`)
	},
}
