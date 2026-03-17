export function onClickOutside(node: HTMLElement, cb: () => void) {
	const handleClick = (event: MouseEvent) => {
		if (node && !node.contains(event.target as Node) && cb) {
			cb()
		}
	}

	document.addEventListener('click', handleClick)

	// Cleanup event listener when node is removed
	return {
		destroy() {
			document.removeEventListener('click', handleClick)
		},
	}
}

export function resizeTextarea(node: HTMLTextAreaElement, value?: string | null) {
	const resizeTextarea = () => {
		node.style.height = 'auto'
		node.style.height = `${node.scrollHeight + 4}px`
	}

	node.addEventListener('input', resizeTextarea)

	resizeTextarea()

	return {
		update(value?: string | null) {
			resizeTextarea()
		},
		destroy() {
			node.removeEventListener('input', resizeTextarea)
		},
	}
}

export function onEnter(node: HTMLTextAreaElement | HTMLInputElement, cb: () => void) {
	const onKeyPress = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault()
			cb()
		}
	}

	;(node as HTMLTextAreaElement).addEventListener('keypress', onKeyPress)

	return {
		destroy() {
			;(node as HTMLTextAreaElement).removeEventListener('keypress', onKeyPress)
		},
	}
}
