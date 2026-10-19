import { writable } from 'svelte/store'

export type ToastTone = 'normal' | 'success' | 'warning' | 'danger'
export type ToastValue = { id: number; message: string; tone: ToastTone; durationMs: number }
export const toastStore = writable<ToastValue[]>([])
