import { writable } from 'svelte/store'

namespace ReferenceGraphController {
  export const selectedNodeId = writable<number | null>(null)

  export const open = (nodeId: number) => {
    selectedNodeId.set(nodeId)
  }

  export const close = () => {
    selectedNodeId.set(null)
  }

  export const toggle = (nodeId: number) => {
    selectedNodeId.update((current) => current === nodeId ? null : nodeId)
  }
}

export default ReferenceGraphController
