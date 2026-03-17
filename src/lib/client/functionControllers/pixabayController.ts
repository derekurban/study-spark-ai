// export const fetchPixabayImages = async (params: PixabayParams): Promise<PixabayData> => {
// 	const url = new URL('https://us-central1-durban-web.cloudfunctions.net/getPixabayPhotos')

// 	// Add the params to the query string
// 	Object.keys(params).forEach((key) => {
// 		url.searchParams.append(key, params[key as keyof PixabayParams] as string)
// 	})

// 	const response = await fetch(url.toString())
// 	if (!response.ok) {
// 		throw new Error(`HTTP error! status: ${response.status}`)
// 	}

// 	const data = await response.json()
// 	return data as PixabayData
// }
