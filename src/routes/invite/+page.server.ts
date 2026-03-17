import { isValidUuid } from '$lib/Utils/utils'
import { error, type Actions, redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import type { InviteLink } from '$lib/database/types'

export const load = (async ({ url, locals: { supabase } }) => {
	const friend_invite_id = url.searchParams.get('invite_id')

	if (!friend_invite_id || !isValidUuid(friend_invite_id)) throw error(404, 'Invalid Invite Link')

	const invite_call = await supabase
		.from('invite_link')
		.select('*')
		.eq('id', friend_invite_id)
		.select()

	if (!invite_call.data || invite_call.data.length == 0 || invite_call.error)
		throw error(404, 'Invalid Invite Link')

	const invite = invite_call.data[0]

	const invite_created = new Date(invite.created_at)
	const now = new Date()
	const diffInMilliseconds = now.getTime() - invite_created.getTime()
	const diffInSeconds = diffInMilliseconds / 1000
	const diffInMinutes = diffInSeconds / 60

	if (diffInMinutes > 15) {
		await supabase.from('invite_link').delete().eq('id', invite.id)
		throw error(404, 'Expired Invite Link')
	}

	const user_call = await supabase.from('profile').select('*').eq('id', invite.resource_id).select()
	if (!user_call.data || user_call.data.length == 0 || user_call.error)
		throw error(404, 'Invalid Invite Link')

	return {
		invite,
		invite_user: user_call.data[0],
	}
}) satisfies PageServerLoad

export const actions: Actions = {
	accept: async ({ locals: { supabase, getSession }, request }) => {
		const form_data = await request.formData()

		const invite_id = form_data.get('invite_id')?.toString()
		if (!invite_id) throw error(404, 'Missing invite id on accept')

		const invite_call = await supabase.from('invite_link').select('*').eq('id', invite_id)
		if (invite_call.error)
			throw error(404, `${invite_call.error.code}: ${invite_call.error.message}`)

		const invite = invite_call.data?.[0]

		if (!invite) throw error(404, 'Failed to find invite from id')

		const session = await getSession()
		const user_id = session?.user.id
		if (!user_id) throw error(404, 'Invalid user id')

		if (invite.owner_id == user_id) throw error(404, 'Cannot accept self-invite')

		const upsert_friend = await supabase.from('friends_with').insert([
			{
				owner_id: user_id,
				friend_id: invite.resource_id,
			},
			{
				friend_id: user_id,
				owner_id: invite.resource_id,
			},
		])

		if (upsert_friend.error)
			throw error(404, `${upsert_friend.error.code}: ${upsert_friend.error.message}`)

		await supabase.from('invite_link').delete().eq('id', invite.id)

		throw redirect(303, '/')
	},
}
