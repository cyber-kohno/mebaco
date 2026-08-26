import { describe, expect, it } from 'vitest'
import type AppElement from '../element/kind/app/app-element'
import type TreeNode from '../tree/tree-node'
import FormulaContext from './formula/formula-context'
import RuntimeLaunch from './runtime-launch'

describe('RuntimeLaunch Signature defaults', () => {
  it('uses an async no-op function for an omitted Signature argument', async () => {
    const appNode = {
      id: 2,
      element: { kind: 'app', appId: 'sample-app-id', id: 'sample' },
      isOpen: true,
      children: [{
        id: 3,
        element: { kind: 'launch-options' },
        isOpen: true,
        children: [{
          id: 4,
          element: { kind: 'launch-arguments' },
          isOpen: true,
          children: [{
            id: 5,
            element: {
              kind: 'launch-argument',
              propId: 'end-process-prop-id',
              id: 'endProcess',
              valueType: {
                type: 'named',
                namedTypeId: 'end-process-type',
                namedTypeKind: 'signature',
              },
              nullable: false,
              defaultValue: { type: 'default' },
            },
            isOpen: true,
            children: [],
          }],
        }],
      }],
    } as TreeNode.Node & { element: AppElement.Element }
    const projectNode = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [
        {
          id: 6,
          element: {
            kind: 'signature-type',
            typeId: 'end-process-type',
            id: 'EndProcess',
            async: true,
            parameters: [],
            returnType: null,
          },
          isOpen: true,
          children: [],
        },
        appNode,
      ],
    } as TreeNode.Node

    const result = RuntimeLaunch.resolve({
      appNode,
      projectNode,
      launchValues: {},
      baseContext: FormulaContext.createEmpty(),
    })

    expect(result.errors).toEqual([])
    expect(result.values.endProcess).toBeTypeOf('function')
    await expect(
      (result.values.endProcess as () => Promise<unknown>)(),
    ).resolves.toBeUndefined()
  })

  it('resolves a Launcher by its stable UUID rather than its display Id', () => {
    const appNode = {
      id: 2,
      element: { kind: 'app', appId: 'sample-app-uuid', id: 'sample' },
      isOpen: true,
      children: [{
        id: 3,
        element: { kind: 'launch-options' },
        isOpen: true,
        children: [{
          id: 4,
          element: { kind: 'launch-arguments' },
          isOpen: true,
          children: [{
            id: 5,
            element: {
              kind: 'launch-argument',
              propId: 'environment-prop-uuid',
              id: 'environment',
              valueType: { type: 'string' },
              nullable: false,
            },
            isOpen: true,
            children: [],
          }],
        }],
      }],
    } as TreeNode.Node & { element: AppElement.Element }
    const projectNode = {
      id: 1,
      element: { kind: 'project' },
      isOpen: true,
      children: [
        appNode,
        {
          id: 6,
          element: {
            kind: 'launcher',
            launcherId: 'production-launcher-uuid',
            id: 'hoge_honban',
            name: 'Production',
            appId: 'sample-app-uuid',
            argumentBindings: [{
              propId: 'environment-prop-uuid',
              kind: 'value',
              source: { type: 'literal', value: 'production' },
            }],
          },
          isOpen: true,
          children: [],
        },
      ],
    } as TreeNode.Node

    const resolved = RuntimeLaunch.resolve({
      appNode,
      projectNode,
      launcherId: 'production-launcher-uuid',
      baseContext: FormulaContext.createEmpty(),
    })
    const displayIdResult = RuntimeLaunch.resolve({
      appNode,
      projectNode,
      launcherId: 'hoge_honban',
      baseContext: FormulaContext.createEmpty(),
    })

    expect(resolved).toEqual({ values: { environment: 'production' }, errors: [] })
    expect(displayIdResult.errors).toHaveLength(1)
  })
})
