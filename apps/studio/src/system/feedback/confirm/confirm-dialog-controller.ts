import { get } from 'svelte/store'
import { confirmDialogStore, type ConfirmChoice } from './confirm-dialog-state'
namespace ConfirmDialogController {
  export const open = (options: { tone?: 'normal' | 'danger'; title?: string; message: string | string[]; choices?: ConfirmChoice[] }): Promise<boolean> => new Promise((resolve) => {
    const choices = [...(options.choices ?? [{ label: 'OK', role: 'proceed' as const }]), { label: 'Cancel', role: 'cancel' as const }]
    confirmDialogStore.set({ tone: options.tone ?? 'normal', title: options.title, message: typeof options.message === 'string' ? [options.message] : options.message, choices: choices.map((choice) => ({ ...choice, callback: async () => { resolve(choice.role === 'proceed'); await choice.callback?.() } })), focus: 0 })
  })
  export const clear = () => confirmDialogStore.set(null)
  export const move = (direction: -1 | 1) => { const value = get(confirmDialogStore); if (value == null) return; confirmDialogStore.set({ ...value, focus: Math.max(0, Math.min(value.choices.length - 1, value.focus + direction)) }) }
  export const apply = async () => { const value = get(confirmDialogStore); if (value == null) return; const choice = value.choices[value.focus]; clear(); await choice?.callback?.() }
}
export default ConfirmDialogController
