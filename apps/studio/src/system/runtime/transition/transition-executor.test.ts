import { describe, expect, it } from 'vitest'
import type TreeNode from '../../tree/tree-node'
import type TransitionElement from '../../element/kind/variable/transition-element'
import FormulaContext from '../formula/formula-context'
import TransitionExecutor from './transition-executor'

let nextId = 1
const node = (element: unknown, children: TreeNode.Node[] = []): TreeNode.Node => ({
  id: nextId++,
  element: element as TreeNode.Node['element'],
  isOpen: true,
  children,
})

describe('TransitionExecutor', () => {
  it('resolves typed launch bindings and requests a transition', () => {
    let request: { appId: string; values: Readonly<Record<string, unknown>> } | null = null
    const target = node({ kind: 'app', appId: 'target-app-id', id: 'Target' }, [
      node({ kind: 'launch-options' }, [
        node({ kind: 'launch-arguments' }, [
          node({
            kind: 'launch-argument',
            propId: 'count-prop-id',
            id: 'count',
            valueType: { type: 'number' },
            nullable: false,
          }),
        ]),
      ]),
    ])
    const transitionNode = node({ kind: 'transition-placeholder' })
    const source = node({ kind: 'app', appId: 'source-app-id', id: 'Source' }, [
      node({ kind: 'launch-options' }),
      node({ kind: 'imports' }, [
        node({ kind: 'transitions', appIds: ['target-app-id'] }),
      ]),
      transitionNode,
    ])
    const project = node({ kind: 'project' }, [source, target])
    const element = {
      kind: 'transition',
      appId: 'target-app-id',
      argumentBindings: [{
        propId: 'count-prop-id',
        kind: 'value',
        source: { type: 'formula', source: '$state.count + 1' },
      }],
    } as TransitionElement.Element
    const result = TransitionExecutor.execute(
      transitionNode.id,
      element,
      FormulaContext.create({
        $state: { count: 2 },
        requestTransition: (appId, values) => { request = { appId, values } },
      }),
      project,
    )

    expect(result).toEqual({ ok: true })
    expect(request).toEqual({ appId: 'target-app-id', values: { count: 3 } })
  })

  it('rejects a target that is not imported by the current App', () => {
    const transitionNode = node({ kind: 'transition-placeholder' })
    const source = node({ kind: 'app', appId: 'source-app-id', id: 'Source' }, [
      node({ kind: 'launch-options' }),
      node({ kind: 'imports' }, [
        node({ kind: 'transitions', appIds: [] }),
      ]),
      transitionNode,
    ])
    const target = node({ kind: 'app', appId: 'target-app-id', id: 'Target' })
    const project = node({ kind: 'project' }, [source, target])
    const result = TransitionExecutor.execute(
      transitionNode.id,
      { kind: 'transition', appId: 'target-app-id', argumentBindings: [] },
      FormulaContext.create(),
      project,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.message).toContain('is not imported')
  })
})
