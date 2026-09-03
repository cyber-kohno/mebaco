import { writable } from 'svelte/store'
import type ElementSearchTypes from './element-search-types'

export const elementSearchStore = writable<ElementSearchTypes.Session | null>(null)
