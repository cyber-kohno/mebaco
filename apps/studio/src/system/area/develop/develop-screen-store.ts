import { writable } from 'svelte/store'

export type DevelopScreen = 'home' | 'workspace'

export const developScreenStore = writable<DevelopScreen>('home')
