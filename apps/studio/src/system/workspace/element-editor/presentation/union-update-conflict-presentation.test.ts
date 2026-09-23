import { afterEach, describe, expect, it } from 'vitest'
import AppSettings from '@system/application/settings/app-settings-store'
import UnionUpdateConflictPresentation from './union-update-conflict-presentation'

afterEach(() => AppSettings.reset())

describe('UnionUpdateConflictPresentation', () => {
  const conflicts = [{
    nodeId: 3,
    sourceLabel: 'state#initial',
    detail: "'done'",
  }]

  it('presents conflicts in English by default', () => {
    expect(UnionUpdateConflictPresentation.create('Status', conflicts)).toEqual({
      title: 'Update Blocked',
      message: [
        "Union Type 'Status' cannot be updated because 1 saved item would become invalid.",
        "node-3: state#initial = 'done'",
        'Change these values before updating the Union Type.',
      ],
    })
  })

  it('localizes prose while preserving technical conflict details', () => {
    AppSettings.setLanguage('ja')

    expect(UnionUpdateConflictPresentation.create('Status', conflicts)).toEqual({
      title: '更新できません',
      message: [
        'Union Type「Status」は、1個の保存済み項目が無効になるため更新できません。',
        "node-3: state#initial = 'done'",
        'Union Typeを更新する前に、これらの値を変更してください。',
      ],
    })
  })
})
