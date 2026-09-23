import { writable } from 'svelte/store'

export type SettingNavigationGuard = {
  hasChanges: () => boolean
  discard: () => void
}

export const settingNavigationGuardStore = writable<SettingNavigationGuard | null>(null)

export const registerSettingNavigationGuard = (
  guard: SettingNavigationGuard,
): (() => void) => {
  settingNavigationGuardStore.set(guard)
  return () => {
    settingNavigationGuardStore.update((current) => current === guard ? null : current)
  }
}
