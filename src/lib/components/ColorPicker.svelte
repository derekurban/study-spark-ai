<script lang="ts">
	export let direction: 'left' | 'right' | 'top' | 'bottom' = 'left'
	export let colors: Array<string> = ['#fff']
	export let active_color: string | null = ''
	export let onChange: (color: string) => void = () => {}

	$: {
		if (!active_color && colors.length > 0) active_color = colors[0]
	}

	const resetFocus = () => {
		if (!document?.activeElement) return

		const activeElement = document.activeElement as HTMLElement
		activeElement.blur()
	}

	const setColor = (color: string) => {
		active_color = color
		onChange(color)
		resetFocus()
	}
</script>

<div class="dropdown dropdown-{direction} dropdown-hover">
	{#if active_color}
		<button disabled class="btn py-1 px-5">
			<div class="w-8 h-8 rounded-md" style="background-color: {active_color};" />
		</button>
	{:else}
		<button disabled class="btn">Click</button>
	{/if}
	<div class="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
		<div class="flex flex-wrap gap-1">
			{#each colors as color}
				<button
					class="p-0 w-8 h-8 rounded-md"
					style="background-color: {color};"
					on:click={() => setColor(color)}
				/>
			{/each}
		</div>
	</div>
</div>
