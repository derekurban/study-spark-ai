<script lang="ts">
	import { onClickOutside } from '$lib/client/actions'

	import type { LoreCategory, LoreElement, LoreUniverse } from '$lib/database/types'
	import { version } from '$app/environment'

	type T2 = $$Generic
	type T = T2 extends { [key: string]: unknown } ? T2 : never
	export let value_key: string
	export let label_key: string = ''
	export let classes: string = ''
	export let value: any
	export let options: Array<T>
	export let disabled = false
	export let placeholder = 'Search...'
	export let no_options = 'No Options'
	export let onSelect: (value: any, label: any) => void = () => {}

	if (!options) throw Error('SearchSelect requires options prop')
	if (!value_key) throw Error('SearchSelect requires value_key prop')
	if (!label_key) label_key = value_key

	let label = ''
	let search_mode = false
	$: {
		if (!search_mode) {
			if (!value) search = ''
			else {
				label = (options.find((o) => o[value_key] == value)?.[label_key] as string) ?? ''
				search = label
			}
		}
	}

	let search = ''

	let dropdown_el: HTMLElement
	let show_modal = false

	$: filtered_options = options.filter(
		(o) => !search || (o[label_key] as string).toLowerCase().includes(search.toLowerCase()),
	)

	const internalOnSelect = (selected_value: any, selected_label: any) => {
		onSelect(selected_value, selected_label)
		label = selected_label
		value = selected_value

		search = label
		onBlur()
		const activeElement = document.activeElement as HTMLElement
		activeElement.blur()
	}

	const onFocus = () => {
		search_mode = true
		search = ''
		show_modal = true
	}

	const onBlur = () => {
		search_mode = false
		if (value) search = label
		show_modal = false
	}
</script>

<div bind:this={dropdown_el} class="dropdown dropdown-end {classes}" use:onClickOutside={onBlur}>
	<!-- svelte-ignore a11y-label-has-associated-control -->
	<slot />
	<input
		class="input input-bordered w-full max-w-xs"
		{disabled}
		type="text"
		bind:value={search}
		{placeholder}
		on:focus={onFocus}
	/>
	<ul class="menu dropdown-content z-[1] p-2 shadow bg-base-100 rounded-box w-52 mt-4">
		{#if filtered_options.length > 0}
			{#each filtered_options as option}
				<li>
					<button on:click={() => internalOnSelect(option[value_key], option[label_key])}>
						{option[label_key]}
					</button>
				</li>
			{/each}
		{:else}
			<li>{no_options}</li>
		{/if}
	</ul>
</div>
