export const callServerAction = async (
	input: URL | RequestInfo,
	init: {
		method: 'POST' | 'GET'
		body?: { [key: string]: any }
	},
) => {
	let formBody: string | undefined = undefined
	if (init?.body) {
		const formArray = []
		for (const property in init.body) {
			const encodedKey = encodeURIComponent(property)
			const encodedValue = encodeURIComponent(init.body[property])
			formArray.push(encodedKey + '=' + encodedValue)
		}
		formBody = formArray.join('&')
	}
	return await fetch(input, {
		method: init.method,
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
		},
		body: formBody,
	})
}
