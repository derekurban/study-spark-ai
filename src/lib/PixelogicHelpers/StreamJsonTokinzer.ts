import StreamReceiver from '$lib/PixelogicHelpers/StreamReceiver'
import type { StreamingTextResponse } from 'ai'
import { writable } from 'svelte/store'

export default class StreamJsonTokenizer {
	private stream_receiver: StreamReceiver
	constructor() {
		this.stream_receiver = new StreamReceiver()
	}

	public async tokenizeStream(response: StreamingTextResponse) {
		const reader = this.stream_receiver.getReaderFromResponse(response)
		if (!reader) return

		let untampered_result = ''

		const result_container: any = {}
		const result_store = writable<any>(undefined)
		const updateStore = () => {
			if (result_container.result) result_store.set(result_container.result)
		}

		this.stream_receiver.processStream(reader, async (readValue) => {
			let char_buffer = ''
			const nextChar = async () => {
				if (char_buffer.length == 0) {
					const read_result = await readValue()
					if (read_result.done) {
						return ''
					}
					char_buffer = read_result.value
					untampered_result += read_result.value
				}
				const char = char_buffer.charAt(0)
				char_buffer = char_buffer.slice(1)
				return char
			}

			const waitOnChar = async (wait_on: Array<string>) => {
				let char = await nextChar()
				while (char && wait_on.includes(char)) char = await nextChar()
				return char
			}

			const waitUntilChar = async (wait_until: Array<string>) => {
				let char = await nextChar()
				while (char && !wait_until.includes(char)) char = await nextChar()
				return char
			}

			const getKey = async () => {
				let key_buffer = ''
				let char = await waitOnChar([' ', '\n', '\t'])
				while (char && char != ':') {
					if (char == '}') return ''
					key_buffer += char
					char = await nextChar()
				}
				return key_buffer.trim().replace(/^'|'$|^"|"$/g, '')
			}

			const getString = async (root_obj: any, root_key: any, end: '"' | "'") => {
				let string_buffer = ''
				let char = await nextChar()
				while (char && char != end) {
					if (char == '\\') {
						const next_char = await nextChar()
						string_buffer += next_char
					} else {
						string_buffer += char
					}
					root_obj[root_key] = string_buffer
					updateStore()
					char = await nextChar()
				}
				root_obj[root_key] = string_buffer
				updateStore()
			}

			const getJsonRecurse = async (root_obj: any, root_key: any) => {
				let char = await nextChar()
				while (char && (char == ' ' || char == '\n' || char == '\t')) char = await nextChar()
				switch (char) {
					case '}': {
						return
					}
					case ']': {
						return
					}
					case '{': {
						root_obj[root_key] = {}
						let key = await getKey()
						while (key) {
							console.log(`Key: <${key}>`)
							await getJsonRecurse(root_obj[root_key], key)
							let char = await nextChar()
							while (char && char != ',' && char != '}') {
								char = await nextChar()
							}
							if (char == '}') key = ''
							else key = await getKey()
						}
						break
					}
					case '[': {
						root_obj[root_key] = []
						let old_length = 0
						await getJsonRecurse(root_obj[root_key], root_obj[root_key].length)
						while (old_length != root_obj[root_key].length) {
							old_length = root_obj[root_key].length
							let char = await nextChar()
							while (char && char != ',' && char != ']') {
								char = await nextChar()
							}
							if (char == ',') await getJsonRecurse(root_obj[root_key], root_obj[root_key].length)
						}
						break
					}
					case '"': {
						await getString(root_obj, root_key, '"')
						return
					}
					case "'": {
						await getString(root_obj, root_key, "'")
						return
					}
					case 't': {
						const true_remaining = ['r', 'u', 'e']
						for (let i = 0; i < true_remaining.length; i++) {
							const char = await nextChar()
							if (char != true_remaining[i]) {
								console.error(`Unexpected character when parsing 'true': <${char}>`)
								return
							}
						}
						root_obj[root_key] = true
						return
					}
					case 'f': {
						const false_remaining = ['a', 'l', 's', 'e']
						for (let i = 0; i < false_remaining.length; i++) {
							const char = await nextChar()
							if (char != false_remaining[i]) {
								console.error(`Unexpected character when parsing 'false': <${char}>`)
								return
							}
						}
						root_obj[root_key] = false
						return
					}
					default: {
						break
					}
				}
			}

			const start_char = await waitUntilChar(['{', '['])
			char_buffer = start_char + char_buffer

			await getJsonRecurse(result_container, 'result')

			await waitUntilChar([''])

			console.log(untampered_result)

			result_store.set('done')
		})

		return {
			store: result_store,
			cancel: async () => {
				await reader.cancel()
			},
		}
	}
}
