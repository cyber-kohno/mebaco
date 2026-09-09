import { invoke } from '@tauri-apps/api/core'

export type ClientLaunchRequest = {
  workspaceId: string
  installationId: string
  bundleId: string
  launcherId: string
}

export type CreateClientShortcutRequest = {
  destinationPath: string
  description: string
  launch: ClientLaunchRequest
}

namespace TauriClientLaunch {
  export const getStartupRequest = (): Promise<ClientLaunchRequest | null> => (
    invoke<ClientLaunchRequest | null>('client_get_startup_launch_request')
  )

  export const createShortcut = (
    request: CreateClientShortcutRequest,
  ): Promise<void> => invoke('client_create_launcher_shortcut', { request })
}

export default TauriClientLaunch
