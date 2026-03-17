import type Page from './Page'

export default class Document {
	private pages: Array<Page>
	constructor(options?: { pages?: Array<Page> }) {
		this.pages = options?.pages ?? []
	}

	public getPages() {
		return this.pages
	}
}
