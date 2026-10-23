import { derived, get, writable } from 'svelte/store'
import type App from '@system/model/app/app'
import type TreeNode from '@system/model/tree/tree-node'
import type ResourceRuntime from './resource/resource-runtime'
import type RuntimeLog from './log/runtime-log'
import type StorageRuntime from './storage/storage-runtime'
import type RuntimePreviewProbe from './preview/runtime-preview-probe'

namespace RuntimeSessionStore {
  export type Presentation = { type: 'application'; title: string }

  export type Session = {
    id: string
    revision: number
    kind: 'preview' | 'application'
    app: App.Element
    appNode: TreeNode.Node
    projectNode: TreeNode.Node
    resourceSession: ResourceRuntime.Session
    logSession: RuntimeLog.Session
    storageSession: StorageRuntime.Session
    launcherId?: string
    launchValues?: Readonly<Record<string, unknown>>
    inspection?: RuntimePreviewProbe.Session
    presentation?: Presentation
  }

  export type Input = Omit<Session, 'id' | 'kind' | 'revision'>
  type State = { sessions: Session[]; activeId: string | null }
  const state = writable<State>({ sessions: [], activeId: null })
  export const sessions = derived(state, ($state) => $state.sessions)
  // Compatibility view for the existing single-session UI and preview tools.
  export const store = derived(state, ($state) => (
    $state.sessions.find((session) => session.id === $state.activeId) ?? null
  ))

  export const find = (id: string): Session | null => (
    get(state).sessions.find((session) => session.id === id) ?? null
  )

  const dispose = (session: Session, next?: Session) => {
    if (session.inspection !== next?.inspection) session.inspection?.dispose()
    if (session.resourceSession !== next?.resourceSession) session.resourceSession.dispose()
  }

  export const create = (input: Input, options: { activate?: boolean } = {}): string => {
    // Development previews remain single-instance, even through the internal API.
    const preview = input.presentation == null
      ? get(sessions).find((session) => session.kind === 'preview')
      : undefined
    if (preview != null) {
      close(preview.id)
    }
    const session: Session = {
      ...input, id: crypto.randomUUID(), revision: 0,
      kind: input.presentation == null ? 'preview' : 'application',
    }
    state.update((current) => ({
      sessions: [...current.sessions, session],
      activeId: options.activate === false ? current.activeId : session.id,
    }))
    return session.id
  }

  export const activate = (id: string): boolean => {
    if (find(id) == null) return false
    state.update((current) => ({ ...current, activeId: id }))
    return true
  }

  // Leaving the operation screen must not imply ending its sessions.
  export const deactivate = () => {
    state.update((current) => ({ ...current, activeId: null }))
  }

  export const replace = (id: string, input: Input): boolean => {
    const current = find(id)
    if (current == null) return false
    const next = { ...input, id, kind: current.kind, revision: current.revision + 1 }
    dispose(current, next)
    state.update((value) => ({ ...value,
      sessions: value.sessions.map((session) => session.id === id ? next : session),
    }))
    return true
  }

  export const open = (session: Input) => {
    const current = get(store)
    if (current != null) {
      dispose(current, { ...session, id: current.id, kind: current.kind, revision: 0 })
      state.update((value) => ({
        sessions: value.sessions.filter((item) => item.id !== current.id), activeId: null,
      }))
    }
    create(session)
  }

  export const close = (id: string | undefined = get(store)?.id) => {
    if (id == null) return
    const session = find(id)
    if (session == null) return
    dispose(session)
    state.update((current) => ({
      sessions: current.sessions.filter((item) => item.id !== id),
      activeId: current.activeId === id ? null : current.activeId,
    }))
  }
}

export default RuntimeSessionStore
