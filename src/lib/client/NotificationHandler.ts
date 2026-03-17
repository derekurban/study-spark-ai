import { uuid } from '$lib/Utils/utils'
import type { Invalidator, Subscriber } from 'svelte/motion'
import { writable, type Writable } from 'svelte/store'

export interface Notification {
	id: string
	message: string
	sub_message?: string
	type?: 'error' | 'warning' | 'success' | 'info'
	icon?: boolean
	seconds?: number
	callback?: () => void
}

class NotificationHandler {
	private notification_store: Writable<Notification[]>

	constructor() {
		this.notification_store = writable<Notification[]>([])
	}

	public subscribe = (run: Subscriber<Notification[]>, invalidate?: Invalidator<Notification[]>) =>
		this.notification_store.subscribe(run, invalidate)

	public enqueue = (new_notif: Omit<Notification, 'id'>) => {
		const notification: Notification = {
			id: uuid(),
			...new_notif,
		}
		this.notification_store.update((notifs) => {
			notifs.push(notification)
			return notifs
		})
	}

	public dequeue = (id: string) => {
		this.notification_store.update((notifs) => {
			notifs = notifs.filter((n) => n.id != id)
			return notifs
		})
	}
}

export const notification_handler = new NotificationHandler()
