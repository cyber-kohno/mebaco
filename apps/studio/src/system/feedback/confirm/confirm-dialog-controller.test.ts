import { afterEach, describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import ConfirmDialogController from './confirm-dialog-controller'
import { confirmDialogStore } from './confirm-dialog-state'

describe('ConfirmDialogController', () => {
  afterEach(() => ConfirmDialogController.clear())

  it('puts an implicit Cancel before a destructive choice and focuses it', async () => {
    const result = ConfirmDialogController.open({
      tone: 'danger',
      message: 'Discard changes?',
      choices: [{ label: 'Discard', role: 'proceed' }],
    })

    expect(get(confirmDialogStore)).toMatchObject({
      focus: 0,
      choices: [
        { label: 'Cancel', role: 'cancel' },
        { label: 'Discard', role: 'proceed' },
      ],
    })

    await ConfirmDialogController.apply()
    await expect(result).resolves.toBe(false)
  })

  it('preserves an explicit safe-first choice order', () => {
    void ConfirmDialogController.open({
      message: 'Discard changes?',
      choices: [
        { label: 'Keep Editing', role: 'cancel' },
        { label: 'Discard', role: 'proceed' },
      ],
    })

    expect(get(confirmDialogStore)?.choices.map((choice) => choice.label))
      .toEqual(['Keep Editing', 'Discard'])
  })
})
