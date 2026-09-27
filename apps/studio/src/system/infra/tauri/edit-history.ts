import { invoke } from '@tauri-apps/api/core'

namespace TauriEditHistory {
  export type Status = {
    canUndo: boolean
    canRedo: boolean
  }

  export const record = (snapshot: string): Promise<void> => (
    invoke('edit_history_record', { snapshot })
  )

  export const undo = (current: string): Promise<string | null> => (
    invoke('edit_history_undo', { current })
  )

  export const redo = (current: string): Promise<string | null> => (
    invoke('edit_history_redo', { current })
  )

  export const clear = (): Promise<void> => invoke('edit_history_clear')

  export const status = (): Promise<Status> => invoke('edit_history_status')
}

export default TauriEditHistory
