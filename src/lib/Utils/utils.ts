import { v4 as uuidv4 } from 'uuid'

export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export const replaceNonASCII = (text: string) => {
	const mappings: { [key: string]: string } = {
		'–': '-',
		'‘': "'",
		'’': "'",
		'…': '...',
		'−': '-',
		'“': '"',
		'”': '"',
	}

	let replacedStr = ''
	for (const char of text) {
		if (char in mappings) {
			replacedStr += mappings[char]
		} else {
			replacedStr += char
		}
	}

	return replacedStr
}

export const checkSimilarity = (vecA: Array<number>, vecB: Array<number>) => {
	let dotProduct = 0,
		magnitudeA = 0,
		magnitudeB = 0

	for (let i = 0; i < vecA.length; i++) {
		dotProduct += vecA[i] * vecB[i] //calculate dot product
		magnitudeA += vecA[i] * vecA[i] //calculate the magnitude of vecA
		magnitudeB += vecB[i] * vecB[i] //calculate the magnitude of vecB
	}

	magnitudeA = Math.sqrt(magnitudeA)
	magnitudeB = Math.sqrt(magnitudeB)

	return 1 - dotProduct / (magnitudeA * magnitudeB)
}

export const uuid = () => uuidv4()

export const blurActiveElement = (document: Document) => {
	if (!document) return

	const active_el = document.activeElement as HTMLElement
	active_el?.blur()
}

export const isValidUuid = (text: string) => {
	return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-4[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(
		text,
	)
}

export const copyToClipboard = (text: string) => {
	if (!navigator) return
	navigator.clipboard.writeText(text).then(
		function () {
			console.log('Copied to clipboard.')
		},
		function (err) {
			console.error('Could not copy text: ', err)
		},
	)
}
