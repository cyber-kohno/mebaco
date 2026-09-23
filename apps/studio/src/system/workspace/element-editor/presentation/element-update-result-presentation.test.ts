import { afterEach, describe, expect, it } from 'vitest'
import AppSettings from '@system/application/settings/app-settings-store'
import type ElementUpdateTransaction from '../element-update-transaction'
import ElementUpdateResultPresentation from './element-update-result-presentation'

afterEach(() => AppSettings.reset())

const result = (notices: readonly ElementUpdateTransaction.Notice[]) => ({
  idChanged: false,
  updatedReferenceNodeIds: [4],
  updatedOccurrenceCount: 3,
  verificationReset: true,
  verificationImpact: { type: 'all' as const },
  notices,
})

describe('ElementUpdateResultPresentation', () => {
  const notices: readonly ElementUpdateTransaction.Notice[] = [
    {
      type: 'object-members-changed',
      addedCount: 0,
      removedCount: 0,
      updatedCount: 0,
      renamedCount: 1,
    },
    {
      type: 'object-members-renamed',
      objectName: 'User',
      renames: [{ previousPath: 'name', currentPath: 'displayName' }],
    },
  ]

  it('preserves the existing English update messages', () => {
    expect(ElementUpdateResultPresentation.createMessages(result(notices))).toEqual([
      'Object members changed: 1 renamed.',
      'Renamed: User.name -> User.displayName',
      'Expression references updated: 1 element / 3 occurrences.',
      'Verification status reset: all elements.',
    ])
  })

  it('localizes prose while preserving Object paths', () => {
    AppSettings.setLanguage('ja')

    expect(ElementUpdateResultPresentation.createMessages(result(notices))).toEqual([
      'Objectメンバーが変更されました: 名前変更 1。',
      '名前変更: User.name -> User.displayName',
      '式の参照を更新しました: 1個の要素 / 3箇所。',
      '全要素のVerify状態をリセットしました。',
    ])
  })
})
