import { getCurrentWindow } from '@tauri-apps/api/window'
import type { Unsubscriber } from 'svelte/store'
import { APP_VERSION } from '../version'
import ProjectSession from '../project/project-session-store'

namespace WindowTitle {
  const applicationTitle = `Mebaco v${APP_VERSION}`

  const getTitle = (session: ProjectSession.Value): string => {
    if (session.savedFingerprint == null) return applicationTitle

    const fileName = session.fileName ?? '(Untitled)'
    return `${fileName}${session.isDirty ? '*' : ''} - ${applicationTitle}`
  }

  const update = (session: ProjectSession.Value) => {
    try {
      void getCurrentWindow().setTitle(getTitle(session)).catch(() => undefined)
    } catch {
      // The browser-only Vite preview has no Tauri window bridge.
    }
  }

  export const subscribe = (): Unsubscriber => ProjectSession.store.subscribe(update)
}

export default WindowTitle
