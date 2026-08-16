import { describe, expect, it } from 'vitest'
import type MebacoElement from '../../element/element'
import type TreeNode from '../../tree/tree-node'
import FormulaContext from '../formula/formula-context'
import RetentionResolver from './retention-resolver'

let nextId = 1
const node = (
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id: nextId++, element, children, isOpen: true })

const host = (
  retentionChildren: TreeNode.Node[],
): TreeNode.Node => node({ kind: 'tag', tagName: 'div', comment: '', styles: [], attributes: [] }, [
  node({ kind: 'retention' }, retentionChildren),
  node({ kind: 'elements' }),
])

describe('RetentionResolver', () => {
  it('evaluates Variables and Actions in order', () => {
    const hostNode = host([
      node({
        kind: 'variable', id: 'color', binding: 'let',
        typeSetting: { type: 'inferred' }, source: "'#ffe'",
      }),
      node({
        kind: 'action', comment: 'Focused row',
        source: "if ($state.focused) $var.color = '#fcc';",
      }),
    ])
    const result = RetentionResolver.resolve(
      hostNode,
      FormulaContext.create({ $state: { focused: true } }),
      node({ kind: 'project' }),
    )

    expect(result.error).toBeNull()
    expect(result.context.$var.color).toBe('#fcc')
  })

  it('does not mutate the parent frame when a child updates an inherited Let', () => {
    const parent = RetentionResolver.resolve(
      host([node({
        kind: 'variable', id: 'color', binding: 'let',
        typeSetting: { type: 'inferred' }, source: "'#ffe'",
      })]),
      FormulaContext.createEmpty(),
      node({ kind: 'project' }),
    )
    const child = RetentionResolver.resolve(
      host([node({
        kind: 'action', comment: '', source: "$var.color = '#fcc';",
      })]),
      parent.context,
      node({ kind: 'project' }),
    )

    expect(child.context.$var.color).toBe('#fcc')
    expect(parent.context.$var.color).toBe('#ffe')
  })

  it('expands Blocks without creating a new scope', () => {
    const hostNode = host([
      node({ kind: 'block', label: 'row colors' }, [
        node({
          kind: 'variable', id: 'color', binding: 'let',
          typeSetting: { type: 'inferred' }, source: "'#ffe'",
        }),
        node({
          kind: 'action', comment: '', source: "$var.color = '#fcc';",
        }),
      ]),
      node({
        kind: 'action', comment: '', source: "$var.color = `${$var.color}-done`;",
      }),
    ])
    const result = RetentionResolver.resolve(
      hostNode,
      FormulaContext.createEmpty(),
      node({ kind: 'project' }),
    )

    expect(result.error).toBeNull()
    expect(result.context.$var.color).toBe('#fcc-done')
  })
})
