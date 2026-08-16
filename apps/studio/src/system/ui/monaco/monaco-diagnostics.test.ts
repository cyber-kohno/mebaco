import { describe, expect, it } from 'vitest'
import MonacoDiagnostics from './monaco-diagnostics'

const monaco = {
  MarkerSeverity: { Warning: 4, Hint: 1, Info: 2, Error: 8 },
  MarkerTag: { Unnecessary: 1 },
} as never

const analysisModel = {
  getPositionAt: (offset: number) => ({ lineNumber: offset, column: 1 }),
} as never

describe('MonacoDiagnostics', () => {
  it('drops unnecessary diagnostics from generated analysis lines', () => {
    const markers = MonacoDiagnostics.createMarkers(
      monaco,
      [{
        start: 2,
        length: 1,
        messageText: 'Generated declaration is never read.',
        category: 2,
        reportsUnnecessary: true,
      }],
      analysisModel,
      'expression',
      4,
      2,
    )

    expect(markers).toEqual([])
  })

  it('keeps diagnostics that belong to user code', () => {
    const markers = MonacoDiagnostics.createMarkers(
      monaco,
      [{
        start: 5,
        length: 1,
        messageText: 'User declaration is never read.',
        category: 2,
        reportsUnnecessary: true,
      }],
      analysisModel,
      'action',
      4,
      2,
    )

    expect(markers).toHaveLength(1)
    expect(markers[0].startLineNumber).toBe(1)
  })
})
