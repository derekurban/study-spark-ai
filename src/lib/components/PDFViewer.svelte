<script lang="ts">
	// @ts-ignore
	import * as pdfjs from 'pdfjs-dist/build/pdf'
	// @ts-ignore
	import { pdfjsWorker } from 'pdfjs-dist/build/pdf.worker'
	import { onDestroy, onMount } from 'svelte'
	import { writable } from 'svelte/store'

	pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker

	export let file: File
	export let current_page: number | undefined = undefined
	export let onLoad: (params: {
		instance: any
		page: number
		total_pages: number
		height: number
		width: number
	}) => void = () => {}
	export let onChangePage: (page_num: number) => void = () => {}

	let previous_file_name = ''
	$: {
		if (previous_file_name !== file.name) {
			console.log('test')
			loadPDF(file)
		}
		previous_file_name = file.name
	}

	let previous_current_page = 1
	$: {
		if ($pdf_store.instance && current_page) {
			if (previous_current_page !== current_page && current_page != $pdf_store.page) {
				console.log('Going to...')
				goToPage(current_page)
			}
			previous_current_page = current_page
		}
	}

	let pdf_scroll_el: HTMLElement
	let pdf_main_canvas: HTMLCanvasElement

	const DEFAULT_PDF_STORE = {
		instance: undefined,
		page: 1,
		total_pages: 0,
		height: 0,
		width: 0,
	}
	let pdf_store = writable<{
		instance: any
		page: number
		total_pages: number
		height: number
		width: number
	}>(DEFAULT_PDF_STORE)

	let scroll_canvas_height = 0
	let scroll_canvas_width = 0

	const renderPageOnCanvas = async (
		canvas: HTMLCanvasElement,
		page_num: number,
		scale: number = 1,
	) => {
		if (!canvas) throw Error('Cannot render page without canvas')
		if (!$pdf_store.instance) throw Error('Cannot render page without pdf instance')
		if (page_num < 1 || page_num > $pdf_store.total_pages)
			throw Error('Cannot render page with invalid page number')

		const page = await $pdf_store.instance.getPage(page_num)

		const viewport = page.getViewport({ scale })
		canvas.height = viewport.height
		canvas.width = viewport.width

		if (canvas == pdf_main_canvas) {
			$pdf_store.height = canvas.height
			$pdf_store.width = canvas.width
		} else {
			scroll_canvas_height = canvas.height
			scroll_canvas_width = canvas.width
		}

		const renderContext = {
			canvasContext: canvas.getContext('2d'),
			viewport: viewport,
		}

		page.render(renderContext)
	}

	const pagePreview = (el: HTMLCanvasElement, page_num: number) => {
		if (!$pdf_store.instance) return

		renderPageOnCanvas(el, page_num, 0.2)
	}

	const loadPDF = async (file: File) => {
		const file_name_split = file.name.split('.')
		file_name_split.pop()

		let reader = new FileReader()
		reader.onload = async function () {
			let pdfUrl = reader.result

			$pdf_store.page = current_page ?? $pdf_store.page
			$pdf_store.instance = await pdfjs.getDocument({ url: pdfUrl }).promise
			$pdf_store.total_pages = $pdf_store.instance.numPages

			await goToPage($pdf_store.page)

			onLoad($pdf_store)
		}

		reader.readAsDataURL(file)
	}

	const goToNextPage = async () => {
		if ($pdf_store.page < $pdf_store.total_pages) {
			pdf_store.update((s) => {
				s.page += 1
				return s
			})
			scrollTo($pdf_store.page)
			await renderPageOnCanvas(pdf_main_canvas, $pdf_store.page)
		}
	}

	const goToPrevPage = async () => {
		if ($pdf_store.page > 1) {
			pdf_store.update((s) => {
				s.page -= 1
				return s
			})
			scrollTo($pdf_store.page)
			await renderPageOnCanvas(pdf_main_canvas, $pdf_store.page)
		}
	}

	const goToPage = async (page_num: number) => {
		if (page_num < 1 || page_num > $pdf_store.total_pages) return

		pdf_store.update((s) => {
			s.page = page_num
			return s
		})

		scrollTo($pdf_store.page)
		await renderPageOnCanvas(pdf_main_canvas, $pdf_store.page)
	}

	const scrollTo = (page_num: number) => {
		const element = pdf_scroll_el.querySelector('#page' + page_num) as HTMLElement
		if (element) {
			pdf_scroll_el.scrollTop =
				element.offsetTop -
				scroll_canvas_height -
				9 -
				pdf_scroll_el.getBoundingClientRect().height / 2
		} else {
			setTimeout(() => {
				const element = pdf_scroll_el.querySelector('#page' + page_num) as HTMLElement
				if (!element) return
				pdf_scroll_el.scrollTop =
					element.offsetTop -
					scroll_canvas_height -
					9 -
					pdf_scroll_el.getBoundingClientRect().height / 2
			}, 1000)
		}
	}

	$: {
		onChangePage($pdf_store.page)
	}

	let key_press_delay: NodeJS.Timeout | undefined
	const onArrowKeyDown = function (event: KeyboardEvent) {
		if (event.key == 'ArrowLeft' || event.key == 'ArrowRight') {
			if (key_press_delay) clearTimeout(key_press_delay)
			key_press_delay = setTimeout(() => {
				switch (event.key) {
					case 'ArrowLeft':
						goToPrevPage()
						break
					case 'ArrowRight':
						goToNextPage()
						break
				}
				key_press_delay = undefined
			}, 100)
		}
	}

	onMount(() => {
		if (document) document.addEventListener('keydown', onArrowKeyDown)
	})

	onDestroy(() => {
		if (document) document.removeEventListener('keydown', onArrowKeyDown)
	})
</script>

<div class="w-full">
	<div class="flex">
		<div
			bind:this={pdf_scroll_el}
			class="flex flex-col gap-2 overflow-auto"
			style="max-height: {$pdf_store.height}px; min-width: {scroll_canvas_width}px;"
		>
			{#each Array($pdf_store.total_pages).fill(0) as _, page_num}
				<div
					id="page{page_num}"
					class="before:absolute before:content-[var(--content)] before:left-0 before:top-0 before:px-2 before:py-1 before:bg-base-100
            before:rounded-br-lg before:overflow-hidden
            relative overflow-hidden rounded-sm border-4 {$pdf_store.page == page_num + 1
						? 'border-primary'
						: 'border-transparent'}"
					style="min-width:{scroll_canvas_width}px; min-height:{scroll_canvas_height}px; --content: '{page_num +
						1}';"
				>
					<canvas use:pagePreview={page_num + 1} on:click={() => goToPage(page_num + 1)} />
				</div>
			{/each}
		</div>
		<div class="divider divider-horizontal flex-grow" />
		<div class="relative">
			<canvas bind:this={pdf_main_canvas} />
			{#if $pdf_store.page > 1}
				<button
					on:click={goToPrevPage}
					class="fa-solid fa-chevron-left opacity-0 absolute left-0 top-0 bottom-0 flex items-center p-8 text-lg text-primary hover:bg-base-100 hover:opacity-75"
				/>
			{/if}
			{#if $pdf_store.page < $pdf_store.total_pages}
				<button
					on:click={goToNextPage}
					class="fa-solid fa-chevron-right opacity-0 absolute right-0 top-0 bottom-0 flex items-center p-8 text-lg text-primary hover:bg-base-100 hover:opacity-75"
				/>
			{/if}
		</div>
	</div>
</div>
