import type { PostgrestError, PostgrestSingleResponse, SupabaseClient } from '@supabase/supabase-js'
import type { Database, LoreCategory, LoreCategoryDescriptor } from '../database/types'

export default class DbContext {
	private supabase

	constructor(supabase: SupabaseClient<Database>) {
		this.supabase = supabase
	}

	public async upsertCategory(category: UpsertCategory) {
		let upserted_category: LoreCategory
		if (category.id) {
			const sb_update_category = await this.supabase
				.from('LoreCategory')
				.update({
					type: category.type,
					definition: category.type,
				})
				.eq('id', category.id)
				.select()

			if (sb_update_category.error) {
				console.log(sb_update_category.error)
				return
			}

			upserted_category = sb_update_category.data[0]
		} else {
			const sb_create_category = await this.supabase
				.from('LoreCategory')
				.insert({
					universe_id: category.universe_id,
					type: category.type,
					definition: category.type,
				})
				.select()

			if (sb_create_category.error) {
				console.log(sb_create_category.error)
				return
			}

			upserted_category = sb_create_category.data[0]
		}

		const sb_fetch_descriptors = await this.supabase
			.from('LoreCategoryDescriptor')
			.select('*')
			.eq('category_id', upserted_category.id)

		if (sb_fetch_descriptors.error) {
			console.log(sb_fetch_descriptors.error)
			return
		}

		const existing_descriptors = category.LoreCategoryDescriptor.filter((d) => !!d.id).map((d) => ({
			...d,
			category_id: upserted_category.id,
		}))
		const new_descriptors = category.LoreCategoryDescriptor.filter((d) => !d.id).map((d) => ({
			...d,
			category_id: upserted_category.id,
		}))
		const existing_descriptor_ids = existing_descriptors.map((d) => d.id)
		const delete_descriptor_ids = sb_fetch_descriptors.data
			.map((d) => d.id)
			.filter((id) => !existing_descriptor_ids.includes(id))

		for (const id of delete_descriptor_ids) {
			const sb_delete_descriptor = await this.supabase
				.from('LoreCategoryDescriptor')
				.delete()
				.eq('id', id)
			if (sb_delete_descriptor.error) {
				console.log(sb_delete_descriptor.error)
				return
			}
		}

		for (const existing_descriptor of existing_descriptors) {
			if (!existing_descriptor.id) continue
			const sb_update_descriptor = await this.supabase
				.from('LoreCategoryDescriptor')
				.update(existing_descriptor)
				.eq('id', existing_descriptor.id)
			if (sb_update_descriptor.error) {
				console.log(sb_update_descriptor.error)
				return
			}
		}

		const sb_create_descriptor = await this.supabase
			.from('LoreCategoryDescriptor')
			.insert(new_descriptors)

		if (sb_create_descriptor.error) {
			console.log(sb_create_descriptor.error)
			return
		}
	}

	public async getElementCollection(type_id: string) {
		const { data, error } = await this.supabase
			.from('LoreElement')
			.select('*, LoreElementDescriptor(*)')
			.eq('type_id', type_id)
		if (data) return data
		else return []
	}

	public async getAllUniverseCollections() {
		const { data, error } = await this.supabase
			.from('LoreUniverse')
			.select('*, LoreCategory(*, LoreElement(*), LoreCategoryDescriptor(*))')
		if (data) return data
		else return []
	}

	public async getAllLoreCategoryDescriptors() {
		const { data, error } = await this.supabase.from('LoreCategoryDescriptor').select('*')

		if (data) return data
		else return []
	}

	public async createLoreElementDescriptor(
		element_id: string,
		descriptor_id: string,
		lore?: string,
	) {
		return this.singleReturnResult(
			await this.supabase
				.from('LoreElementDescriptor')
				.insert({
					element_id,
					descriptor_id,
					lore,
				})
				.select(),
		)
	}

	public async updateLoreElementDescriptor(id: string, lore?: string | null) {
		const { data, error } = await this.supabase
			.from('LoreElementDescriptor')
			.update({ lore })
			.eq('id', id)
			.select()
		if (data) return data
		else return []
	}

	public async createLoreCategoryDescriptor(category_id: string, type: string, definition: string) {
		return this.singleReturnResult(
			await this.supabase
				.from('LoreCategoryDescriptor')
				.insert([
					{
						category_id,
						type,
						definition,
					},
				])
				.select(),
		)
	}

	public async updateLoreCategoryDescriptor(id: string, type: string, definition: string) {
		const { data, error } = await this.supabase
			.from('LoreCategoryDescriptor')
			.update({ type, definition })
			.eq('id', id)
			.select()
		if (data) return data
		else return []
	}

	public async deleteLoreElementDescriptor(id: string) {
		return this.singleReturnResult(
			await this.supabase.from('LoreElementDescriptor').delete().eq('id', id).select(),
		)
	}

	public async deleteLoreCategoryDescriptor(id: string) {
		return this.singleReturnResult(
			await this.supabase.from('LoreCategoryDescriptor').delete().eq('id', id).select(),
		)
	}

	public async getLoreElementCollection(element_id: string) {
		return this.singleReturnResult(
			await this.supabase
				.from('LoreElement')
				.select('*, LoreElementDescriptor(*)')
				.eq('id', element_id),
		)
	}

	public async getLoreCategoryCollection(category_id: string) {
		return this.singleReturnResult(
			await this.supabase
				.from('LoreCategory')
				.select('*, LoreCategoryDescriptor(*)')
				.eq('id', category_id),
		)
	}

	public async getAllLoreCategoryCollections() {
		return this.multipleReturnResult(
			await this.supabase.from('LoreCategory').select('*, LoreCategoryDescriptor(*)'),
		)
	}

	public async getAllLoreCategories() {
		return this.multipleReturnResult(await this.supabase.from('LoreCategory').select('*'))
	}

	public async getLoreElement(id: string) {
		return this.singleReturnResult(
			await this.supabase.from('LoreElement').select('*, LoreElementDescriptor(*)').eq('id', id),
		)
	}

	public async getLoreCategory(id: string) {
		return this.singleReturnResult(
			await this.supabase.from('LoreCategory').select('*').eq('id', id),
		)
	}

	public async createLoreCategory(universe_id: string, type: string, definition?: string) {
		return this.singleReturnResult(
			await this.supabase
				.from('LoreCategory')
				.insert([
					{
						universe_id,
						type,
						definition,
					},
				])
				.select(),
		)
	}

	public async updateLoreCategory(id: string, type: string, definition?: string) {
		return this.singleReturnResult(
			await this.supabase.from('LoreCategory').update({ type, definition }).eq('id', id).select(),
		)
	}

	public async deleteLoreCategory(id: string) {
		return this.singleReturnResult(
			await this.supabase.from('LoreCategory').delete().eq('id', id).select(),
		)
	}

	public async getAllLoreElementCollections() {
		return this.multipleReturnResult(
			await this.supabase.from('LoreElement').select('*, LoreElementDescriptor(*)'),
		)
	}
	public async getAllLoreElements() {
		return this.multipleReturnResult(await this.supabase.from('LoreElement').select('*'))
	}

	public async createLoreElement(category_id: string, name: string) {
		return this.singleReturnResult(
			await this.supabase
				.from('LoreElement')
				.insert({
					name,
					category_id,
				})
				.select(),
		)
	}

	public async updateLoreElement(id: string, name: string, description?: string) {
		return this.singleReturnResult(
			await this.supabase.from('LoreElement').update({ name, description }).eq('id', id).select(),
		)
	}

	public async deleteLoreElement(id: string) {
		return this.singleReturnResult(
			await this.supabase.from('LoreElement').delete().eq('id', id).select(),
		)
	}

	public async getAllLoreUniverses() {
		return this.multipleReturnResult(await this.supabase.from('LoreUniverse').select('*'))
	}

	public async getLoreUniverse(id: string) {
		return this.singleReturnResult(
			await this.supabase.from('LoreUniverse').select('*').eq('id', id),
		)
	}

	public async createLoreUniverse(name: string, description?: string) {
		return this.singleReturnResult(
			await this.supabase.from('LoreUniverse').insert([{ name, description }]).select(),
		)
	}

	public async updateLoreUniverse(id: string, name: string, description: string | null) {
		const { data, error } = await this.supabase
			.from('LoreUniverse')
			.update({ name, description })
			.eq('id', id)
			.select()
		if (data) return data
		else return []
	}

	public async deleteLoreUniverse(id: string) {
		const { error } = await this.supabase.from('LoreUniverse').delete().eq('id', id)
		return true
	}

	private singleReturnResult<T>(response: PostgrestSingleResponse<T[]>) {
		const { data, error } = response
		if (error || !data || data.length > 1) {
			return {
				data: null,
				error: error
					? `${error.code}: ${error.message}`
					: `Expected single data return, got ${data}`,
			}
		} else {
			return {
				data: data[0],
				error: null,
			}
		}
	}

	private multipleReturnResult<T>(response: PostgrestSingleResponse<T[]>) {
		const { data, error } = response
		if (error || !data) {
			console.error(data, error)
			return {
				data: null,
				error: error
					? `${error.code}: ${error.message}`
					: `Expected multiple data return, got ${data}`,
			}
		} else {
			return {
				data: data,
				error: null,
			}
		}
	}
}
