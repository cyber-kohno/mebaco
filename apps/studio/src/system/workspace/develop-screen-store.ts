import { writable } from 'svelte/store'

export type DevelopScreen = 'home' | 'workspace' | 'launchers'

export const developScreenStore = writable<DevelopScreen>('home')
