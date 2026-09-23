import { describe, expect, it } from 'vitest'
import MonacoInjection from './monaco-injection'

describe('MonacoInjection', () => {
  it('does not inject namespace roots without scoped declarations', () => {
    expect(MonacoInjection.createDefaultInjectionSource('expression')).toBe('')
    expect(MonacoInjection.createDefaultInjectionSource('action')).toBe('')
    expect(MonacoInjection.createDefaultInjectionSource('code')).toBe('')
    expect(MonacoInjection.getAnalysisOffsetLine('expression', {
      injectionSource: '',
    })).toBe(3)
  })

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
    expect(MonacoInjection.getAnalysisOffsetLine('expression', {
      injectionSource: 'type MyObj = {};\ndeclare var $state: MyObj;',
    })).toBe(5)
  })

  it('uses detailed expected type text for expression analysis', () => {
    const source = MonacoInjection.wrapForAnalysis(
      '{}',
      'expression',
      { expectedTypeText: 'User | null' },
    )

    expect(source).toContain('const __mebacoExpressionResult: User | null = (')
  })

  it('uses sync and async wrappers to control await', () => {
    expect(MonacoInjection.wrapForAnalysis('await work()', 'action'))
      .toContain('function __mebacoAction() {')
    expect(MonacoInjection.wrapForAnalysis('await work()', 'action', { allowAwait: true }))
      .toContain('async function __mebacoAction() {')
    expect(MonacoInjection.wrapForAnalysis('await work()', 'expression', { allowAwait: true }))
      .toContain('async function __mebacoExpression() {')
  })

  it('wraps Function Code as a typed body with direct parameters', () => {
    const source = MonacoInjection.wrapForAnalysis(
      'const doubled = value * 2\nreturn doubled',
      'code',
      {
        expectedTypeText: 'number',
        functionParameters: [{ name: 'value', typeText: 'number' }],
      },
    )

    expect(source).toContain('function __mebacoCode(value: number): number {')
    expect(source).toContain('const doubled = value * 2\nreturn doubled')
    expect(source).not.toContain('$args')
    expect(MonacoInjection.getAnalysisOffsetLine('code')).toBe(2)
  })

  it('adds typed Function parameters to the visible Monaco model', () => {
    const source = MonacoInjection.appendFunctionParameterDeclarations(
      'declare var $state: { count: number; };',
      [
        { name: 'value', typeText: 'number' },
        { name: 'user', typeText: 'User | null' },
      ],
    )

    expect(source).toContain('declare let value: number;')
    expect(source).toContain('declare let user: User | null;')
    expect(source).not.toContain('$args')
  })

  it('uses Promise return types for async Function Code', () => {
    expect(MonacoInjection.wrapForAnalysis('return await load()', 'code', {
      allowAwait: true,
      expectedTypeText: 'User',
    })).toContain('async function __mebacoCode(): Promise<User> {')
  })
})
