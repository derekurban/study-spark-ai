interface CallFetchArgs {
	method: 'POST' | 'GET' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS'
	body?: object
	headers?: HeadersInit
}

export const callFetch = async (endpoint: string, args: CallFetchArgs) => {
	const response = await fetch(endpoint, {
		method: args.method,
		headers: {
			'Content-Type': 'application/json',
			...args.headers,
		},
		body: args.body ? JSON.stringify(args.body) : null,
	})

	if (!response.ok) {
		try {
			console.error(await response.json())
		} catch {
			console.error(response.status, response.statusText)
		}
		return null
	}
	return response
}
