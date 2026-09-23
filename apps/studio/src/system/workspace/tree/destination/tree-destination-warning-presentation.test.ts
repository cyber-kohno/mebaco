import { afterEach, describe, expect, it } from 'vitest'
import AppSettings from '@system/application/settings/app-settings-store'
import TreeDestinationWarningPresentation from './tree-destination-warning-presentation'

afterEach(() => AppSettings.reset())

describe('TreeDestinationWarningPresentation', () => {
  it('presents reference changes in English by default', () => {
    expect(TreeDestinationWarningPresentation.createMessage({
      type: 'reference-target-changed',
      nodeId: 8,
      sourceLabel: 'action#source',
    })).toBe(
      'Moving this element would change a reference target at node-8: action#source.',
    )
  })

  it('localizes the explanation and preserves verifier details', () => {
    AppSettings.setLanguage('ja')

    expect(TreeDestinationWarningPresentation.createMessage({
      type: 'expression-invalid',
      nodeId: 8,
      details: ['Unknown Function.'],
    })).toBe(
      '移動した要素はnode-8のこのスコープで無効です: Unknown Function.',
    )
  })
})
