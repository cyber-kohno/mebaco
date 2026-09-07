import {
  open,
  save,
  type OpenDialogOptions,
  type OpenDialogReturn,
  type SaveDialogOptions,
} from '@tauri-apps/plugin-dialog'

export type {
  OpenDialogOptions,
  OpenDialogReturn,
  SaveDialogOptions,
} from '@tauri-apps/plugin-dialog'

namespace TauriDialog {
  export const openPath = <T extends OpenDialogOptions>(
    options?: T,
  ): Promise<OpenDialogReturn<T>> => open(options)

  export const savePath = (
    options?: SaveDialogOptions,
  ): Promise<string | null> => save(options)
}

export default TauriDialog
