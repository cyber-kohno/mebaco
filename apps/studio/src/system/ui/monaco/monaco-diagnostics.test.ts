import { describe, expect, it } from 'vitest'
import MonacoDiagnostics from './monaco-diagnostics'

const monaco = {
  MarkerSeverity: { Warning: 4, Hint: 1, Info: 2, Error: 8 },
  MarkerTag: { Unnecessary: 1 },
} as never

const analysisModel = {
  getPositionAt: (offset: number) => ({ lineNumber: offset, column: 1 }),
  getLineMaxColumn: () => 8,
} as never

const userModel = {
  getLineCount: () => 2,
  getLineMaxColumn: (lineNumber: number) => lineNumber === 2 ? 8 : 4,
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

  it('drops errors from generated analysis lines', () => {
    const markers = MonacoDiagnostics.createMarkers(
      monaco,
      [{
        start: 2,
        length: 1,
        messageText: "Cannot find name 'Data'.",
        category: 1,
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

  it('maps a missing Function Code return from the generated wrapper to user code', () => {
    const markers = MonacoDiagnostics.createMarkers(
      monaco,
      [{
        start: 4,
        length: 1,
        messageText: "Function lacks ending return statement and return type does not include 'undefined'.",
        category: 1,
      }],
      analysisModel,
      'code',
      4,
      2,
    )

    expect(markers).toEqual([expect.objectContaining({
      severity: 8,
      startLineNumber: 1,
      endLineNumber: 2,
    })])
  })

  it('creates a whole-model marker for custom expression validation errors', () => {
    expect(MonacoDiagnostics.createWholeModelErrorMarker(
      monaco,
      userModel,
      'Collection item type could not be inferred.',
    )).toEqual({
      severity: 8,
      message: 'Collection item type could not be inferred.',
      startLineNumber: 1,
      startColumn: 1,
      endLineNumber: 2,
      endColumn: 8,
    })
  })
})
