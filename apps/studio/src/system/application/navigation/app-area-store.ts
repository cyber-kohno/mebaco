import { writable } from 'svelte/store'

export type AppArea = 'client' | 'develop' | 'setting'

export const appAreaStore = writable<AppArea>('develop')
