import { describe, expect, it } from 'vitest'
import type MebacoElement from '@system/model/element/element'
import type TreeNode from '@system/model/tree/tree-node'
import FormulaContext from '../formula/formula-context'
import RetentionResolver from './retention-resolver'
import SignatureDefinition from '@system/model/type-system/signature/signature-definition'

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

  it('rejects a State update in the selected Conditional branch', () => {
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

    expect(result.error?.message).toContain(
      "State '$state.result' cannot be updated during retention evaluation",
    )
    expect(context.$state.result).toBe(0)
  })

  it('exposes pure Retention Functions through $fn', () => {
    const functionNode = node({
      kind: 'function',
      id: 'scale',
      signature: {
        mode: 'inline',
        definition: SignatureDefinition.create(
        false,
        [SignatureDefinition.createParameter('value', { type: 'number' }, false, 'value-id')],
        { valueType: { type: 'number' }, nullable: false },
        ),
      },
      implementation: { mode: 'procedure' },
    }, [
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
        kind: 'variable', id: 'result', binding: 'const',
        typeSetting: { type: 'inferred' }, source: '$fn.scale(4)',
      }),
    ])
    const projectNode = node({ kind: 'project' }, [hostNode])
    const context = FormulaContext.create({ $state: { result: 0 } })
    const result = RetentionResolver.resolve(hostNode, context, projectNode)

    expect(result.error).toBeNull()
    expect(result.context.$var.result).toBe(12)
    expect(context.$state.result).toBe(0)
  })

  it('lets a Retention Function update a captured let Variable', () => {
    const functionNode = node({
      kind: 'function',
      id: 'increment',
      signature: {
        mode: 'inline',
        definition: SignatureDefinition.create(
        false,
        [],
        { valueType: { type: 'number' }, nullable: false },
        ),
      },
      implementation: { mode: 'procedure' },
    }, [
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
      node({
        kind: 'variable', id: 'result', binding: 'let',
        typeSetting: { type: 'inferred' }, source: '0',
      }),
      functionNode,
      node({
        kind: 'action', comment: '', source: '$var.result = $fn.increment()',
      }),
    ])
    const projectNode = node({ kind: 'project' }, [hostNode])
    const context = FormulaContext.create({ $state: { result: 0 } })
    const result = RetentionResolver.resolve(hostNode, context, projectNode)

    expect(result.error).toBeNull()
    expect(result.context.$var.count).toBe(2)
    expect(result.context.$var.result).toBe(2)
    expect(context.$state.result).toBe(0)
  })

  it('rejects a State update inside a Retention Function', () => {
    const functionNode = node({
      kind: 'function',
      id: 'update',
      signature: {
        mode: 'inline',
        definition: SignatureDefinition.create(false, [], null),
      },
      implementation: { mode: 'procedure' },
    }, [
      node({ kind: 'function-procedure' }, [
        node({ kind: 'action', comment: '', source: '$state.result = 1' }),
      ]),
    ])
    const hostNode = host([
      functionNode,
      node({ kind: 'action', comment: '', source: '$fn.update()' }),
    ])
    const projectNode = node({ kind: 'project' }, [hostNode])
    const context = FormulaContext.create({ $state: { result: 0 } })

    const result = RetentionResolver.resolve(hostNode, context, projectNode)

    expect(result.error?.message).toContain(
      "State '$state.result' cannot be updated during retention evaluation",
    )
    expect(context.$state.result).toBe(0)
  })

  it('rejects deep and aliased State updates', () => {
    const hostNode = host([
      node({
        kind: 'variable', id: 'data', binding: 'const',
        typeSetting: { type: 'inferred' }, source: '$state.data',
      }),
      node({ kind: 'action', comment: '', source: '$var.data.count += 1' }),
    ])
    const state = { data: { count: 1 } }

    const result = RetentionResolver.resolve(
      hostNode,
      FormulaContext.create({ $state: state }),
      node({ kind: 'project' }),
    )

    expect(result.error?.message).toContain("State '$state.data.count'")
    expect(state.data.count).toBe(1)
  })

  it('rejects State writes in Retention Variable formulas', () => {
    const hostNode = host([node({
      kind: 'variable', id: 'result', binding: 'const',
      typeSetting: { type: 'inferred' }, source: '($state.result = 1)',
    })])
    const state = { result: 0 }

    const result = RetentionResolver.resolve(
      hostNode,
      FormulaContext.create({ $state: state }),
      node({ kind: 'project' }),
    )

    expect(result.error?.message).toContain("State '$state.result'")
    expect(state.result).toBe(0)
  })
})
