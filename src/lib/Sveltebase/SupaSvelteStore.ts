import type { PostgrestFilterBuilder } from '@supabase/postgrest-js'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { GenericSchema } from '@supabase/supabase-js/dist/module/lib/types'
import { writable, type Subscriber, type Writable, type Invalidator } from 'svelte/store'

type InsertRowType<
	Schema extends GenericSchema,
	TableName extends string,
> = Schema['Tables'][TableName] extends {
	Insert: unknown
}
	? Schema['Tables'][TableName]['Insert']
	: never

type QueryCondition<T extends string> = {
	type: 'eq' | 'gt' | 'lt' | 'gte' | 'lte' | 'neq'
	column: T
	value: string | number
}

export class SupaSvelteStore<
	Database,
	TableName extends string & keyof Schema['Tables'],
	SchemaName extends string & keyof Database = 'public' extends keyof Database
		? 'public'
		: string & keyof Database,
	Schema extends GenericSchema = Database[SchemaName] extends GenericSchema
		? Database[SchemaName]
		: any,
	Row extends Schema['Tables'][TableName]['Row'] = Schema['Tables'][TableName]['Row'],
	InsertRow extends InsertRowType<Schema, TableName> = InsertRowType<Schema, TableName>,
	ColumnName extends string = keyof Row extends string ? keyof Row : never,
> {
	supabase: SupabaseClient<Database, SchemaName, Schema>
	schema: string
	table: string
	primary_keys: Array<ColumnName>
	store: Writable<Map<string, Row>>

	constructor(
		supabase: SupabaseClient<Database, SchemaName, Schema>,
		schema: SchemaName,
		table: TableName,
		primary_keys: Array<ColumnName>,
	) {
		this.supabase = supabase
		this.schema = schema
		this.table = table
		this.primary_keys = primary_keys
		this.store = writable(new Map<string, Row>())
	}

	subscribe = (
		run: Subscriber<Map<string, Row>>,
		invalidate?: Invalidator<Map<string, Row>> | undefined,
	) => this.store.subscribe(run, invalidate)

	async get(conds?: QueryCondition<ColumnName>[]) {
		const conditions = this.parseConditions(conds)

		let query = this.supabase.from(this.table).select('*')
		query = this.buildQueryConditions(query, conditions)
		const data = await query.returns<Array<Row>>().then(({ data, error }) => {
			if (error) console.error(`${error.code}: ${error.message}`)

			return data && !error ? data : ([] as Array<Row>)
		})

		const status = data.length > 0

		if (status) {
			this.store.update((m) => {
				data.forEach((r) => {
					const p_key = this.getPrimaryKey(r)
					m.set(p_key, r)
				})
				return m
			})
		}

		return {
			status: status,
		}
	}

	async insert(rows: Array<InsertRow>) {
		const data = await this.supabase
			.from(this.table)
			.insert(rows)
			.select()
			.returns<Array<Row>>()
			.then(({ data, error }) => {
				if (error) console.error(`${error.code}: ${error.message}`)
				return data && !error ? data : ([] as Array<Row>)
			})

		const status = data.length > 0

		if (status) {
			this.store.update((m) => {
				data.forEach((r) => {
					const p_key = this.getPrimaryKey(r)
					m.set(p_key, r)
				})
				return m
			})
		}

		return {
			status: status,
		}
	}

	async upsert(rows: Array<InsertRow>) {
		const data = await this.supabase
			.from(this.table)
			.upsert(rows)
			.select()
			.returns<Array<Row>>()
			.then(({ data, error }) => {
				if (error) console.error(`${error.code}: ${error.message}`)
				return data && !error ? data : ([] as Array<Row>)
			})

		const status = data.length > 0

		if (status) {
			this.store.update((m) => {
				data.forEach((r) => {
					const p_key = this.getPrimaryKey(r)
					m.set(p_key, r)
				})
				return m
			})
		}

		return {
			status: status,
		}
	}

	async delete(row: Row) {
		const conditions = this.generatePrimaryKeyCondition(row)

		let query = this.supabase.from(this.table).delete()
		query = this.buildQueryConditions(query, conditions)
		const status = await query.then(({ error }) => {
			if (error) console.error(`${error.code}: ${error.message}`)
			return !error
		})

		if (status) {
			this.store.update((m) => {
				const p_key = this.getPrimaryKey(row)
				m.delete(p_key)
				return m
			})
		}

		return {
			status: status,
		}
	}

	public getPrimaryKey(row: Row) {
		return this.primary_keys
			.reduce<Array<string>>((res, key) => {
				if (row[key]) {
					res.push(`${row[key]}`)
					return res
				} else {
					throw Error('Missing Key')
				}
			}, [])
			.join('#')
	}

	private generatePrimaryKeyCondition(row: Row) {
		const conditions: QueryCondition<ColumnName>[] = []
		for (const key of this.primary_keys) {
			conditions.push({
				type: 'eq',
				column: key,
				value: row[key] as string | number,
			})
		}
		return conditions
	}

	private isQueryCondition(
		object: QueryCondition<ColumnName>,
	): object is QueryCondition<ColumnName> {
		return 'type' in object && 'column' in object && 'value' in object
	}

	private buildQueryConditions<Result>(
		query: PostgrestFilterBuilder<Schema, Row, Result>,
		conditions: QueryCondition<ColumnName>[],
	) {
		conditions.forEach((condition: QueryCondition<ColumnName>) => {
			switch (condition.type) {
				case 'eq':
					query = query.eq(condition.column, condition.value)
					break
				case 'gt':
					query = query.gt(condition.column, condition.value)
					break
				case 'lt':
					query = query.lt(condition.column, condition.value)
					break
				case 'gte':
					query = query.gte(condition.column, condition.value)
					break
				case 'lte':
					query = query.lte(condition.column, condition.value)
					break
				case 'neq':
					query = query.neq(condition.column, condition.value)
					break
			}
		})
		return query
	}

	private parseConditions(
		conditions: QueryCondition<ColumnName> | QueryCondition<ColumnName>[] | undefined,
	): QueryCondition<ColumnName>[] {
		if (!conditions || !(Array.isArray(conditions) && conditions.length == 0)) return []
		else return conditions.filter(this.isQueryCondition)
	}
}

export const supaSvelteStore = <
	Database,
	TableName extends string & keyof Schema['Tables'],
	SchemaName extends string & keyof Database = 'public' extends keyof Database
		? 'public'
		: string & keyof Database,
	Schema extends GenericSchema = Database[SchemaName] extends GenericSchema
		? Database[SchemaName]
		: any,
	Row extends Schema['Tables'][TableName]['Row'] = Schema['Tables'][TableName]['Row'],
	InsertRow extends InsertRowType<Schema, TableName> = InsertRowType<Schema, TableName>,
	ColumnName extends string = keyof Row extends string ? keyof Row : never,
>(
	supabase: SupabaseClient<Database, SchemaName, Schema>,
	schema: SchemaName,
	table: TableName,
	primary_keys: Array<ColumnName>,
): SupaSvelteStore<Database, TableName, SchemaName, Schema, Row, InsertRow, ColumnName> =>
	new SupaSvelteStore(supabase, schema, table, primary_keys)
