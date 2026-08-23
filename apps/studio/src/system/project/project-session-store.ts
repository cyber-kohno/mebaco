import { writable } from 'svelte/store'
import type TreeNode from '../tree/tree-node'
import ProjectDocument from './project-document'

namespace ProjectSession {
  export type Value = {
    path: string | null
    fileName: string | null
    savedFingerprint: string | null
    isDirty: boolean
  }

  const createInitial = (): Value => ({
    path: null,
    fileName: null,
    savedFingerprint: null,
    isDirty: false,
  })

  export const store = writable<Value>(createInitial())

  const getFileName = (path: string): string => {
    const normalizedPath = path.replaceAll('\\', '/')
    const segments = normalizedPath.split('/')
    return segments[segments.length - 1] || path
  }

  const createSavedValue = (
    rootNode: TreeNode.Node,
    path: string | null,
  ): Value => ({
    path,
    fileName: path == null ? null : getFileName(path),
    savedFingerprint: ProjectDocument.createFingerprint(rootNode),
    isDirty: false,
  })

  export const startNew = (rootNode: TreeNode.Node) => {
    store.set(createSavedValue(rootNode, null))
  }

  export const markSaved = (
    rootNode: TreeNode.Node,
    path: string,
  ) => {
    store.set(createSavedValue(rootNode, path))
  }

  export const updateFromRoot = (rootNode: TreeNode.Node) => {
    store.update((current) => {
      if (current.savedFingerprint == null) return current

      const isDirty = ProjectDocument.createFingerprint(rootNode) !== current.savedFingerprint
      return current.isDirty === isDirty ? current : { ...current, isDirty }
    })
  }

  export const clear = () => {
    store.set(createInitial())
  }
}

export default ProjectSession
