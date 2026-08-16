import { writable } from 'svelte/store'
import type ActionMenuState from './action-menu-state'

export const actionMenuStore = writable<ActionMenuState.Value | null>(null)
