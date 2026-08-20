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

  it('executes the selected control Conditional branch', () => {
    const hostNode = host([
      node({ kind: 'control-conditional' }, [
        node({ kind: 'if', condition: '$state.focused' }, [
          node({ kind: 'action', comment: '', source: '$state.result = 1' }),
        ]),
        node({ kind: 'else' }, [
          node({ kind: 'action', comment: '', source: '$state.result = 2' }),
        ]),
      ]),
    ])
    const context = FormulaContext.create({ $state: { focused: false, result: 0 } })
    const result = RetentionResolver.resolve(hostNode, context, node({ kind: 'project' }))

    expect(result.error).toBeNull()
    expect(context.$state.result).toBe(2)
  })

  it('exposes Retention Functions through $function', () => {
    const functionNode = node({
      kind: 'function', id: 'scale', mode: 'inline', async: false,
      returnType: { valueType: { type: 'number' }, nullable: false },
    }, [
      node({ kind: 'function-arguments' }, [
        node({
          kind: 'function-argument', id: 'value',
          valueType: { type: 'number' }, nullable: false,
        }),
      ]),
      node({ kind: 'function-procedure' }, [
        node({ kind: 'function-return', source: '$args.value * $var.factor' }),
      ]),
    ])
    const hostNode = host([
      node({
        kind: 'variable', id: 'factor', binding: 'const',
        typeSetting: { type: 'inferred' }, source: '3',
      }),
      functionNode,
      node({
        kind: 'action', comment: '', source: '$state.result = $function.scale(4)',
      }),
    ])
    const projectNode = node({ kind: 'project' }, [hostNode])
    const context = FormulaContext.create({ $state: { result: 0 } })
    const result = RetentionResolver.resolve(hostNode, context, projectNode)

    expect(result.error).toBeNull()
    expect(context.$state.result).toBe(12)
  })

  it('lets a Retention Function update a captured let Variable', () => {
    const functionNode = node({
      kind: 'function', id: 'increment', mode: 'inline', async: false,
      returnType: { valueType: { type: 'number' }, nullable: false },
    }, [
      node({ kind: 'function-arguments' }),
      node({ kind: 'function-procedure' }, [
        node({ kind: 'action', comment: '', source: '$var.count += 1' }),
        node({ kind: 'function-return', source: '$var.count' }),
      ]),
    ])
    const hostNode = host([
      node({
        kind: 'variable', id: 'count', binding: 'let',
        typeSetting: { type: 'inferred' }, source: '1',
      }),
      functionNode,
      node({
        kind: 'action', comment: '', source: '$state.result = $function.increment()',
      }),
    ])
    const projectNode = node({ kind: 'project' }, [hostNode])
    const context = FormulaContext.create({ $state: { result: 0 } })
    const result = RetentionResolver.resolve(hostNode, context, projectNode)

    expect(result.error).toBeNull()
    expect(result.context.$var.count).toBe(2)
    expect(context.$state.result).toBe(2)
  })
})
