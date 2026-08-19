import { get } from 'svelte/store'
import { toastStore, type ToastTone } from './toast-state'

let nextId = 1
namespace ToastController {
  export const show = (message: string, options: { tone?: ToastTone; durationMs?: number } = {}): number => {
    const id = nextId++
    toastStore.update((items) => [...items, { id, message, tone: options.tone ?? 'normal', durationMs: options.durationMs ?? 2400 }])
    return id
  }
  export const dismiss = (id: number) => toastStore.update((items) => items.filter((item) => item.id !== id))
  export const clear = () => toastStore.set([])
  export const current = () => get(toastStore)
}
export default ToastController
