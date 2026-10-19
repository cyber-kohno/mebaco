import { afterEach, describe, expect, it } from 'vitest'
import AppSettings from '@system/application/settings/app-settings-store'
import type FunctionDeletionPolicy from '@system/model/function/function-deletion-policy'
import FunctionDeletionRebindingPresentation from './function-deletion-rebinding-presentation'

afterEach(() => AppSettings.reset())

describe('FunctionDeletionRebindingPresentation', () => {
  const rebindings = [{
    reference: { sourceNodeId: 14, sourceLabel: 'action#source' },
    replacementNodeId: 5,
  }] as FunctionDeletionPolicy.Rebinding[]

  it('preserves the existing English presentation', () => {
    expect(FunctionDeletionRebindingPresentation.create('save', rebindings)).toEqual({
      title: 'Cannot Delete Function',
      message: [
        'Deleting this Function would redirect calls in 1 element to another Function with the same Id.',
        'node-14: action#source -> node-5: function.save',
        'Change the references before deleting this Function.',
      ],
    })
  })

  it('localizes prose while preserving reference details', () => {
    AppSettings.setLanguage('ja')

    expect(FunctionDeletionRebindingPresentation.create('save', rebindings)).toEqual({
      title: 'Functionを削除できません',
      message: [
        'このFunctionを削除すると1個の要素内の呼び出しが、同じIdを持つ別のFunctionを参照します。',
        'node-14: action#source -> node-5: function.save',
        'このFunctionを削除する前に参照を変更してください。',
      ],
    })
  })
})
