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

  export const createCheckpoint = (checkoutId: string, snapshot: string): Promise<void> =>
    invoke('edit_history_create_checkpoint', { checkoutId, snapshot })

  export const getCheckpoint = (checkoutId: string): Promise<string> =>
    invoke('edit_history_get_checkpoint', { checkoutId })

  export const finishCheckpoint = (checkoutId: string, rollback: boolean): Promise<void> =>
    invoke('edit_history_finish_checkpoint', { checkoutId, rollback })

  export const commitCheckpoint = (checkoutId: string, changed: boolean): Promise<void> =>
    invoke('edit_history_commit_checkpoint', { checkoutId, changed })
}

export default TauriEditHistory
