import { writable } from 'svelte/store'

namespace ReferenceGraphController {
  export const visible = writable(true)

  export const open = () => {
    visible.set(true)
  }

  export const close = () => {
    visible.set(false)
  }

  export const toggle = () => {
    visible.update((current) => !current)
  }
}

export default ReferenceGraphController
