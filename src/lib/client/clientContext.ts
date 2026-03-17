import { SupaSvelteStore, supaSvelteStore } from '$lib/Sveltebase/SupaSvelteStore'
import type { Database, StudyClass, StudyMaterial } from '$lib/database/types'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getContext, setContext } from 'svelte'
import { derived, writable, type Readable, type Writable } from 'svelte/store'

interface ContextMap {
	active_class_id: Writable<string>
	active_material_id: Writable<string>
	active_class: Readable<StudyClass | undefined>
	active_material: Readable<StudyMaterial | undefined>
	study_classes: SupaSvelteStore<Database, 'study_class'>
	study_materials: SupaSvelteStore<Database, 'study_material'>
	study_tags: SupaSvelteStore<Database, 'study_tag'>
	study_chunks: SupaSvelteStore<Database, 'study_chunk'>
	study_chapters: SupaSvelteStore<Database, 'study_chapter'>
	friends_in_classes: SupaSvelteStore<Database, 'friend_in_class'>
}

export const initStudyContext = (supabase: SupabaseClient) => {
	const active_class_id_store = writable('')
	const active_material_id_store = writable('')
	const friend_in_class_store = supaSvelteStore<Database, 'friend_in_class'>(
		supabase,
		'public',
		'friend_in_class',
		['class_id', 'friend_id'],
	)
	const study_classes_store = supaSvelteStore<Database, 'study_class'>(
		supabase,
		'public',
		'study_class',
		['id'],
	)
	const study_materials_store = supaSvelteStore<Database, 'study_material'>(
		supabase,
		'public',
		'study_material',
		['id'],
	)
	const study_tags_store = supaSvelteStore<Database, 'study_tag'>(supabase, 'public', 'study_tag', [
		'id',
	])
	const study_chunks_store = supaSvelteStore<Database, 'study_chunk'>(
		supabase,
		'public',
		'study_chunk',
		['id'],
	)
	const study_chapters_store = supaSvelteStore<Database, 'study_chapter'>(
		supabase,
		'public',
		'study_chapter',
		['id'],
	)
	const active_class_store = derived(
		[active_class_id_store, study_classes_store],
		([$active_class_id_store, $study_classes_store]) => {
			return $study_classes_store.get($active_class_id_store)
		},
	)
	const active_matieral_store = derived(
		[active_class_id_store, study_materials_store],
		([$active_class_id_store, $study_materials_store]) => {
			return $study_materials_store.get($active_class_id_store)
		},
	)
	setStudyContext('active_class_id', active_class_id_store)
	setStudyContext('active_class', active_class_store)
	setStudyContext('study_classes', study_classes_store)
	setStudyContext('study_materials', study_materials_store)
	setStudyContext('study_tags', study_tags_store)
	setStudyContext('study_chunks', study_chunks_store)
	setStudyContext('study_chapters', study_chapters_store)
	setStudyContext('active_material_id', active_material_id_store)
	setStudyContext('active_material', active_matieral_store)
	setStudyContext('friends_in_classes', friend_in_class_store)
}

export const getAllStudyContexts = (): ContextMap => {
	return {
		active_class: getStudyContext('active_class'),
		active_class_id: getStudyContext('active_class_id'),
		study_classes: getStudyContext('study_classes'),
		study_materials: getStudyContext('study_materials'),
		study_tags: getStudyContext('study_tags'),
		study_chunks: getStudyContext('study_chunks'),
		study_chapters: getStudyContext('study_chapters'),
		active_material_id: getStudyContext('active_material_id'),
		active_material: getStudyContext('active_material'),
		friends_in_classes: getStudyContext('friends_in_classes'),
	}
}

export const setStudyContext = <KeyT extends string & keyof ContextMap>(
	key: KeyT,
	value: ContextMap[KeyT],
): ContextMap[KeyT] => {
	return setContext<ContextMap[KeyT]>(key, value)
}

export const getStudyContext = <KeyT extends string & keyof ContextMap>(
	key: KeyT,
): ContextMap[KeyT] => {
	return getContext<ContextMap[KeyT]>(key)
}
