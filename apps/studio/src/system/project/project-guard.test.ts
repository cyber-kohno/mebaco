import { afterEach, describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import AppSettings from '@system/application/settings/app-settings-store'
import {
  ConfirmDialogController,
  confirmDialogStore,
} from '@system/ui/feedback/confirm'
import ProjectGuard from './project-guard'
import ProjectSession from './project-session-store'

afterEach(() => {
  ConfirmDialogController.clear()
  ProjectSession.clear()
  AppSettings.reset()
})

describe('ProjectGuard', () => {
  it('uses the current language for the unsaved changes confirmation', () => {
    ProjectSession.markDirty()
    AppSettings.setLanguage('ja')

    void ProjectGuard.confirmDiscard()

    expect(get(confirmDialogStore)).toMatchObject({
      title: '未保存の変更',
      message: ['保存されていない変更があります。破棄しますか？'],
      choices: [
        { label: 'キャンセル', role: 'cancel' },
        { label: '破棄', role: 'proceed' },
      ],
    })
  })
})
