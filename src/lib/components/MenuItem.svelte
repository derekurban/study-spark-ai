<script lang="ts">
	import { onMount } from 'svelte'
	import ChevronDownIcon from 'svelte-material-icons/ChevronDown.svelte'
	import ChevronUpIcon from 'svelte-material-icons/ChevronUp.svelte'

	export let onSelect: undefined | (() => void) = undefined

	let opened = false
	function toggleMenu() {
		opened = !opened
	}

	let leaf = false

	let slot: HTMLElement
	onMount(() => {
		leaf = !!slot.innerHTML
	})
</script>

<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="menu-item">
	{#if leaf}
		<span class="menu-item-title" on:click={toggleMenu} on:keypress={toggleMenu}>
			<slot name="title" />
			{#if opened}
				<ChevronUpIcon />
			{:else}
				<ChevronDownIcon />
			{/if}
		</span>
		<div bind:this={slot} class={`menu-sub-items ${opened ? '' : 'closed'}`}>
			<slot />
		</div>
	{:else}
		<span
			class="menu-item-title"
			on:click={() => {
				if (onSelect) onSelect()
			}}
			on:keypress={() => {
				if (onSelect) onSelect()
			}}
		>
			<slot name="title" />
		</span>
		<div bind:this={slot} class="menu-sub-items">
			<slot />
		</div>
	{/if}
</div>

<style lang="less">
	.menu-item {
	}

	.menu-item-title {
		cursor: pointer;
	}

	.menu-sub-items {
		margin-left: 20px;
		overflow: hidden;

		&.closed {
			height: 0px;
		}
	}
</style>
