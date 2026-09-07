import {
  getCurrentWindow,
  type CloseRequestedEvent,
} from '@tauri-apps/api/window'

namespace TauriWindow {
  export const setTitle = (title: string): Promise<void> => getCurrentWindow().setTitle(title)

  export const onCloseRequested = (
    handler: (event: CloseRequestedEvent) => void | Promise<void>,
  ): Promise<() => void> => getCurrentWindow().onCloseRequested(handler)
}

export default TauriWindow
