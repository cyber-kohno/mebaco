import { writable } from 'svelte/store'

export type ClientScreen =
  | { type: 'packages' }
  | { type: 'launch-setup'; installationId: string }

export const clientScreenStore = writable<ClientScreen>({ type: 'packages' })

namespace ClientNavigation {
  export const openPackages = () => clientScreenStore.set({ type: 'packages' })
  export const openLaunchSetup = (installationId: string) => (
    clientScreenStore.set({ type: 'launch-setup', installationId })
  )
}

export default ClientNavigation
