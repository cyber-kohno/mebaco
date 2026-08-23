import { writable } from 'svelte/store'
import type { CommandSession } from './command-types'

export const commandSessionStore = writable<CommandSession | null>(null)

export default commandSessionStore
