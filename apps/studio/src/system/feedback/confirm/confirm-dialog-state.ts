import { writable } from 'svelte/store'
export type ConfirmChoice = { label: string; role?: 'proceed' | 'cancel' | 'neutral'; callback?: () => void | Promise<void> }
export type ConfirmDialogValue = { tone: 'normal' | 'danger'; title?: string; message: string[]; choices: ConfirmChoice[]; focus: number }
export const confirmDialogStore = writable<ConfirmDialogValue | null>(null)
