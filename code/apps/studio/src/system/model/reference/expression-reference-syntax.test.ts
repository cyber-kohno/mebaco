import { describe, expect, it } from 'vitest'
import TypeScript from 'typescript'
import ExpressionReferenceSyntax from './expression-reference-syntax'

const findMember = (source: string) => {
  const file = TypeScript.createSourceFile('test.ts', source, TypeScript.ScriptTarget.Latest, true)
  let result: ExpressionReferenceSyntax.Member | null = null
  const visit = (node: TypeScript.Node) => {
    result ??= ExpressionReferenceSyntax.getMember(node)
    TypeScript.forEachChild(node, visit)
  }
  visit(file)
  return result
}

describe('ExpressionReferenceSyntax', () => {
  it('recognizes key value storage members', () => {
    expect(findMember('$storage.keyValue.settings.get()')).toMatchObject({
      root: '$storage.keyValue', id: 'settings', quote: '',
    })
    expect(findMember("$storage.keyValue['settings'].get()")).toMatchObject({
      root: '$storage.keyValue', id: 'settings', quote: "'",
    })
  })
})
