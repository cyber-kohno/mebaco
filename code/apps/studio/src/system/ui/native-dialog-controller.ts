import type {
  OpenDialogOptions,
  OpenDialogReturn,
  SaveDialogOptions,
} from '../infra/tauri/dialog'
import { writable } from 'svelte/store'
import TauriDialog from '../infra/tauri/dialog'

namespace NativeDialogController {
  let activeDialogCount = 0
  const activeStore = writable(false)

  export const isActive = (): boolean => activeDialogCount > 0
  export const active = { subscribe: activeStore.subscribe }

  const releaseWebviewFocus = async (): Promise<void> => {
    if (typeof document === 'undefined') return

    const activeElement = document.activeElement
    if (activeElement instanceof HTMLElement) activeElement.blur()

    if (typeof requestAnimationFrame !== 'function') return
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
  }

  const run = async <T>(showDialog: () => Promise<T>): Promise<T> => {
    activeDialogCount += 1
    activeStore.set(true)
    try {
      await releaseWebviewFocus()
      return await showDialog()
    } finally {
      activeDialogCount = Math.max(0, activeDialogCount - 1)
      activeStore.set(isActive())
    }
  }

  export const open = <T extends OpenDialogOptions>(
    options?: T,
  ): Promise<OpenDialogReturn<T>> => run(() => TauriDialog.openPath(options))

  export const save = (
    options?: SaveDialogOptions,
  ): Promise<string | null> => run(() => TauriDialog.savePath(options))
}

export default NativeDialogController
