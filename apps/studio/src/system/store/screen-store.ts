import { writable } from 'svelte/store'

export type Screen = 'start' | 'develop'

export const screenStore = writable<Screen>('start')
