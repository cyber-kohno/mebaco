import { writable } from 'svelte/store'
import DevelopInteractionMode from './develop-interaction-mode'

export const developInteractionStore = writable<DevelopInteractionMode.Value>(
  DevelopInteractionMode.normal(),
)
