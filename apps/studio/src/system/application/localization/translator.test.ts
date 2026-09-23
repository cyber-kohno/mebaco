import { afterEach, describe, expect, it } from 'vitest'
import { get } from 'svelte/store'
import AppSettings from '@system/application/settings/app-settings-store'
import {
  translate,
  translateFor,
  translatorStore,
} from './translator'

afterEach(() => AppSettings.reset())

describe('localization translator', () => {
  it('uses the requested language catalog', () => {
    expect(translateFor('en', 'common.action.cancel')).toBe('Cancel')
    expect(translateFor('ja', 'common.action.cancel')).toBe('キャンセル')
    expect(translateFor('ja', 'common.action.back')).toBe('戻る')
  })

  it('uses the current in-memory application language', () => {
    AppSettings.setLanguage('ja')

    expect(translate('project.unsavedChanges.title')).toBe('未保存の変更')
  })

  it('reactively updates settings descriptions', () => {
    expect(get(translatorStore)('settings.general.intro'))
      .toBe('Configure behavior shared across Mebaco. Display language changes immediately; select Apply to keep the change.')

    AppSettings.setLanguage('ja')

    expect(get(translatorStore)('settings.general.intro'))
      .toBe('Mebaco全体に関する設定を行います。表示言語は変更するとすぐにプレビューへ反映され、適用を押すと設定が確定します。')
  })

  it('uses the code editor category without an implementation-level subgroup', () => {
    expect(translateFor('en', 'settings.category.codeEditor')).toBe('Code editor')
    expect(translateFor('ja', 'settings.codeEditor.intro'))
      .toBe('コードエディターに関する設定を行います。変更内容はここでプレビューされ、適用を押すと開いているエディターと新しく作成するエディターに反映されます。')
  })

  it('translates element editor descriptions', () => {
    expect(translateFor('en', 'workspace.elementEditor.function.procedure.description'))
      .toBe('Add statements to the Procedure child element to implement this Function.')
    expect(translateFor('ja', 'workspace.elementEditor.function.procedure.description'))
      .toBe('このFunctionを実装するには、子要素のProcedureにステートメントを追加してください。')
  })

  it('translates settings labels and workspace actions', () => {
    expect(translateFor('ja', 'settings.category.elementDefaults')).toBe('要素の初期値')
    expect(translateFor('ja', 'shell.area.develop')).toBe('開発')
    expect(translateFor('ja', 'common.action.saveWithShortcut', { shortcut: 'Ctrl+S' }))
      .toBe('保存（Ctrl+S）')
    expect(translateFor('ja', 'common.action.update')).toBe('更新')
  })

  it('translates develop and client home copy with counts', () => {
    expect(translateFor('ja', 'workspace.developHome.start.title')).toBe('開発を開始')
    expect(translateFor('ja', 'client.packages.screen.title')).toBe('インストール済みパッケージ')
    expect(translateFor('ja', 'client.packages.item.launchers.many', { count: 3 }))
      .toBe('Launcher 3個')
    expect(translateFor('ja', 'client.packages.status.description.one'))
      .toBe('1個のResourceパスを起動設定で指定できます。')
  })
})
