import { describe, expect, it } from 'vitest'
import MonacoInjection from './monaco-injection'

describe('MonacoInjection', () => {
  it('isolates analysis declarations from the global injection model', () => {
    const source = MonacoInjection.wrapForAnalysis(
      '$state.value',
      'expression',
      {
        injectionSource: [
          'type MyObj = { value: string; };',
          'declare var $state: { value: MyObj; };',
        ].join('\n'),
      },
    )

    expect(source.startsWith('export {};\n')).toBe(true)
  })

  it('includes the module boundary in diagnostic line offsets', () => {
    expect(MonacoInjection.getAnalysisOffsetLine({
      injectionSource: 'type MyObj = {};\ndeclare var $state: MyObj;',
    })).toBe(4)
  })

  it('uses detailed expected type text for expression analysis', () => {
    const source = MonacoInjection.wrapForAnalysis(
      '{}',
      'expression',
      { expectedTypeText: 'User | null' },
    )

    expect(source).toContain('const __mebacoExpressionResult: User | null = (')
  })
})
