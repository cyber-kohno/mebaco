import { describe, expect, it } from 'vitest'
import ReferenceGraph from './reference-graph'
import type TreeNode from '../../tree/tree-node'

const node = (
  id: number,
  element: Record<string, unknown>,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({
  id,
  element: element as TreeNode.Node['element'],
  isOpen: true,
  children,
})

describe('ReferenceGraph', () => {
  it('reuses one analyzed snapshot while selecting different nodes', () => {
    const component = node(2, {
      kind: 'component',
      componentId: 'component-uuid',
      id: 'Card',
    })
    const use = node(3, {
      kind: 'component-use',
      componentId: 'component-uuid',
      propBindings: [],
    })
    const root = node(1, { kind: 'project' }, [component, use])
    const snapshot = ReferenceGraph.createSnapshot(root)

    const componentGraph = snapshot.select(component.id)
    expect(componentGraph.references).toHaveLength(1)
    expect(snapshot.select(use.id).dependencies).toEqual([{
      sourceNodeId: use.id,
      targetNodeId: component.id,
      targetLabel: 'component.Card',
    }])
    expect(snapshot.select(component.id)).toBe(componentGraph)
  })

  it('resolves structured references by stable definition UUID only', () => {
    const component = node(2, {
      kind: 'component',
      componentId: 'component-uuid',
      id: 'RenamedCard',
    })
    const use = node(3, {
      kind: 'component-use',
      componentId: 'component-uuid',
      propBindings: [],
    })
    const root = node(1, { kind: 'project' }, [component, use])

    expect(ReferenceGraph.build(root, component.id).references).toEqual([
      {
        sourceNodeId: use.id,
        sourceLabel: 'component-use#componentId',
        targetNodeId: component.id,
        targetLabel: 'component.RenamedCard',
        sourceType: 'structural',
      },
    ])

    use.element = {
      kind: 'component-use',
      componentId: 'RenamedCard',
      propBindings: [],
    }
    expect(ReferenceGraph.build(root, component.id).references).toEqual([])
  })

  it('collects expression references and formats both directions with node ids', () => {
    const state = node(3, {
      kind: 'state',
      id: 'data',
      initial: JSON.stringify({ type: 'formula', source: '0' }),
    })
    const tag = node(21, {
      kind: 'tag',
      tagName: 'div',
      comment: '',
      attributes: JSON.stringify([
        {
          type: 'attribute',
          name: 'class',
          value: { type: 'formula', source: '$state.data' },
        },
      ]),
      styles: '[]',
    })
    const conditional = node(33, {
      kind: 'if',
      condition: '$state.data > 0',
    })
    const loopChild = node(42, {
      kind: 'if',
      condition: '$var.index > 0',
    })
    const loop = node(41, {
      kind: 'loop',
      mode: 'count',
      countSource: '$state.data',
      indexId: 'index',
    }, [loopChild])
    const root = node(1, { kind: 'project' }, [state, tag, conditional, loop])

    const stateGraph = ReferenceGraph.build(root, state.id)
    expect(stateGraph.canHaveReferences).toBe(true)
    expect(stateGraph.canHaveDependencies).toBe(true)
    expect(stateGraph.references).toEqual([
      {
        sourceNodeId: 21,
        sourceLabel: 'tag#attribute',
        targetNodeId: 3,
        targetLabel: 'state.data',
        sourceType: 'expression',
      },
      {
        sourceNodeId: 33,
        sourceLabel: 'if#condition',
        targetNodeId: 3,
        targetLabel: 'state.data',
        sourceType: 'expression',
      },
      {
        sourceNodeId: 41,
        sourceLabel: 'loop#count',
        targetNodeId: 3,
        targetLabel: 'state.data',
        sourceType: 'expression',
      },
    ])

    const tagGraph = ReferenceGraph.build(root, tag.id)
    expect(tagGraph.canHaveReferences).toBe(false)
    expect(tagGraph.canHaveDependencies).toBe(true)
    expect(tagGraph.dependencies).toEqual([
      {
        sourceNodeId: 21,
        targetNodeId: 3,
        targetLabel: 'state.data',
      },
    ])

    const projectGraph = ReferenceGraph.build(root, root.id)
    expect(projectGraph.canHaveReferences).toBe(false)
    expect(projectGraph.canHaveDependencies).toBe(false)
    expect(projectGraph.references).toEqual([])
    expect(projectGraph.dependencies).toEqual([])

    const loopGraph = ReferenceGraph.build(root, loop.id)
    expect(loopGraph.canHaveReferences).toBe(false)
    expect(loopGraph.references).toEqual([])

    const loopChildGraph = ReferenceGraph.build(root, loopChild.id)
    expect(loopChildGraph.dependencies).toEqual([
      {
        sourceNodeId: loopChild.id,
        targetNodeId: loop.id,
        targetLabel: 'loop.index',
      },
    ])
  })

  it('collects App references from transition accessors', () => {
    const app = node(2, { kind: 'app', appId: 'app-uuid', id: 'user-detail' })
    const action = node(3, {
      kind: 'action',
      comment: '',
      source: '$transition.userDetail({})',
    })
    const root = node(1, { kind: 'project' }, [app, action])

    expect(ReferenceGraph.build(root, app.id).references).toEqual([{
      sourceNodeId: action.id,
      sourceLabel: 'action#source',
      targetNodeId: app.id,
      targetLabel: 'app.user-detail',
      sourceType: 'expression',
    }])
  })

  it('collects App references from imported Transitions', () => {
    const targetApp = node(2, { kind: 'app', appId: 'target-app-id', id: 'target' })
    const imports = node(6, { kind: 'transitions', appIds: ['target-app-id'] })
    const sourceApp = node(3, { kind: 'app', appId: 'source-app-id', id: 'source' }, [
      node(4, { kind: 'launch-options' }),
      node(5, { kind: 'imports' }, [imports]),
    ])
    const root = node(1, { kind: 'project' }, [sourceApp, targetApp])

    expect(ReferenceGraph.build(root, targetApp.id).references).toContainEqual({
      sourceNodeId: imports.id,
      sourceLabel: 'transitions#App',
      targetNodeId: targetApp.id,
      targetLabel: 'app.target',
      sourceType: 'structural',
    })
  })

  it('collects direct transition argument object keys for the target App', () => {
    const argument = node(5, {
      kind: 'launch-argument', propId: 'user-id-prop', id: 'userId',
      valueType: { type: 'number' }, nullable: false,
    })
    const app = node(2, { kind: 'app', appId: 'app-uuid', id: 'user-detail' }, [
      node(3, { kind: 'launch-options' }, [
        node(4, { kind: 'launch-arguments' }, [argument]),
      ]),
    ])
    const action = node(8, {
      kind: 'action', comment: '',
      source: "$transition.userDetail({ userId: 1 }); $transition['userDetail']({ ['userId']: 2 })",
    })
    const root = node(1, { kind: 'project' }, [app, action])

    expect(ReferenceGraph.build(root, argument.id).references).toEqual([{
      sourceNodeId: action.id,
      sourceLabel: 'action#source',
      targetNodeId: argument.id,
      targetLabel: 'launch-argument.userId',
      sourceType: 'expression',
    }])
    expect(ReferenceGraph.build(root, action.id).dependencies).toContainEqual({
      sourceNodeId: action.id,
      targetNodeId: argument.id,
      targetLabel: 'launch-argument.userId',
    })
  })

  it('collects Style UUID references from Tags and inherited Styles', () => {
    const baseStyle = node(2, {
      kind: 'style',
      styleId: 'base-style-uuid',
      id: 'base',
      rules: [],
      bases: [],
    })
    const derivedStyle = node(3, {
      kind: 'style',
      styleId: 'derived-style-uuid',
      id: 'derived',
      rules: [],
      bases: [{
        referenceId: 'base-reference-uuid',
        styleId: 'base-style-uuid',
        arguments: [],
      }],
    })
    const tag = node(4, {
      kind: 'tag',
      tagName: 'div',
      comment: '',
      attributes: [],
      styles: [{
        referenceId: 'style-application-uuid',
        styleId: 'base-style-uuid',
        arguments: [],
      }],
    })
    const root = node(1, { kind: 'project' }, [baseStyle, derivedStyle, tag])

    expect(ReferenceGraph.build(root, baseStyle.id).references).toEqual([
      {
        sourceNodeId: derivedStyle.id,
        sourceLabel: 'style#bases',
        targetNodeId: baseStyle.id,
        targetLabel: 'style.base',
        sourceType: 'structural',
      },
      {
        sourceNodeId: tag.id,
        sourceLabel: 'tag#style',
        targetNodeId: baseStyle.id,
        targetLabel: 'style.base',
        sourceType: 'structural',
      },
    ])
  })

  it('resolves $param references only through the owning Style parameter scope', () => {
    const baseParameter = node(4, {
      kind: 'style-param',
      parameterId: 'base-color-parameter',
      id: 'color',
      valueType: 'color',
    })
    const otherParameter = node(8, {
      kind: 'style-param',
      parameterId: 'other-color-parameter',
      id: 'color',
      valueType: 'color',
    })
    const baseStyle = node(2, {
      kind: 'style',
      styleId: 'base-style',
      id: 'base',
      rules: [{
        type: 'declaration',
        property: 'color',
        value: { type: 'formula', source: '$param.color' },
      }],
      bases: [],
    }, [node(3, { kind: 'style-params' }, [baseParameter])])
    const derivedStyle = node(5, {
      kind: 'style',
      styleId: 'derived-style',
      id: 'derived',
      rules: [{
        type: 'declaration',
        property: 'background-color',
        value: { type: 'formula', source: '$param.color' },
      }],
      bases: [{
        referenceId: 'base-ref',
        styleId: 'base-style',
        arguments: [{
          parameterId: 'base-color-parameter',
          binding: { type: 'delegate' },
        }],
      }],
    })
    const otherStyle = node(6, {
      kind: 'style',
      styleId: 'other-style',
      id: 'other',
      rules: [{
        type: 'declaration',
        property: 'color',
        value: { type: 'formula', source: '$param.color' },
      }],
      bases: [],
    }, [node(7, { kind: 'style-params' }, [otherParameter])])
    const root = node(1, { kind: 'project' }, [baseStyle, derivedStyle, otherStyle])

    expect(ReferenceGraph.build(root, baseParameter.id).references
      .filter((reference) => reference.sourceType === 'expression'))
      .toEqual([
        expect.objectContaining({ sourceNodeId: baseStyle.id, targetNodeId: baseParameter.id }),
        expect.objectContaining({ sourceNodeId: derivedStyle.id, targetNodeId: baseParameter.id }),
      ])
    expect(ReferenceGraph.build(root, otherParameter.id).references
      .filter((reference) => reference.sourceType === 'expression'))
      .toEqual([
        expect.objectContaining({ sourceNodeId: otherStyle.id, targetNodeId: otherParameter.id }),
      ])
  })

  it('resolves $props references only within the owning Component', () => {
    const firstProp = node(4, {
      kind: 'value-prop',
      propId: 'first-name-prop',
      id: 'name',
      valueType: { type: 'string' },
      nullable: false,
    })
    const firstExpression = node(5, {
      kind: 'if',
      condition: '$props.name.length > 0',
    })
    const secondProp = node(8, {
      kind: 'value-prop',
      propId: 'second-name-prop',
      id: 'name',
      valueType: { type: 'string' },
      nullable: false,
    })
    const secondExpression = node(9, {
      kind: 'if',
      condition: '$props.name.length > 1',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'component', componentId: 'first-component', id: 'First' }, [
        node(3, { kind: 'props' }, [firstProp]),
        firstExpression,
      ]),
      node(6, { kind: 'component', componentId: 'second-component', id: 'Second' }, [
        node(7, { kind: 'props' }, [secondProp]),
        secondExpression,
      ]),
    ])

    expect(ReferenceGraph.build(root, firstProp.id).references).toEqual([{
      sourceNodeId: firstExpression.id,
      sourceLabel: 'if#condition',
      targetNodeId: firstProp.id,
      targetLabel: 'value-prop.name',
      sourceType: 'expression',
    }])
    expect(ReferenceGraph.build(root, secondProp.id).references).toEqual([{
      sourceNodeId: secondExpression.id,
      sourceLabel: 'if#condition',
      targetNodeId: secondProp.id,
      targetLabel: 'value-prop.name',
      sourceType: 'expression',
    }])
  })

  it('resolves $local references in order and only within the owning Style', () => {
    const first = node(4, {
      kind: 'variable', id: 'value', binding: 'const',
      typeSetting: { type: 'inferred' }, source: '1',
    })
    const second = node(5, {
      kind: 'variable', id: 'next', binding: 'const',
      typeSetting: { type: 'inferred' }, source: '$local.value + 1',
    })
    const style = node(2, {
      kind: 'style', styleId: 'style-a', id: 'a', bases: [],
      rules: [{
        type: 'declaration', property: 'z-index',
        value: { type: 'formula', source: '$local.next.toString()' },
      }],
    }, [node(3, { kind: 'style-locals' }, [first, second])])
    const unrelated = node(6, {
      kind: 'style', styleId: 'style-b', id: 'b', bases: [],
      rules: [{
        type: 'declaration', property: 'z-index',
        value: { type: 'formula', source: '$local.value.toString()' },
      }],
    })
    const root = node(1, { kind: 'project' }, [style, unrelated])

    expect(ReferenceGraph.build(root, first.id).references).toEqual([
      expect.objectContaining({
        sourceNodeId: second.id,
        targetNodeId: first.id,
        sourceLabel: 'variable#initial',
      }),
    ])
    expect(ReferenceGraph.build(root, second.id).references).toEqual([
      expect.objectContaining({
        sourceNodeId: style.id,
        targetNodeId: second.id,
        sourceLabel: 'style#rules',
      }),
    ])
    expect(ReferenceGraph.build(root, second.id).dependencies).toEqual([
      expect.objectContaining({ sourceNodeId: second.id, targetNodeId: first.id }),
    ])
  })

  it('collects $type references from TypeScript type syntax', () => {
    const userType = node(2, {
      kind: 'object-type', typeId: 'user-type', id: 'User',
      baseObjectIds: [], properties: [],
    })
    const action = node(3, {
      kind: 'action', comment: '',
      source: 'const user = value as $type.User; use<$type.User>(user)',
    })
    const root = node(1, { kind: 'project' }, [userType, action])

    expect(ReferenceGraph.build(root, userType.id).references).toEqual([{
      sourceNodeId: action.id,
      sourceLabel: 'action#source',
      targetNodeId: userType.id,
      targetLabel: 'object-type.User',
      sourceType: 'expression',
    }])
    expect(ReferenceGraph.build(root, action.id).dependencies).toContainEqual({
      sourceNodeId: action.id,
      targetNodeId: userType.id,
      targetLabel: 'object-type.User',
    })
  })

  it('resolves same-name $type references only within the visible App scope', () => {
    const firstType = node(4, {
      kind: 'union-type', typeId: 'first-result-type', id: 'Result',
      definition: { type: 'literal', values: ['first'] },
    })
    const firstAction = node(5, {
      kind: 'action', comment: '', source: 'value as $type.Result',
    })
    const secondType = node(8, {
      kind: 'signature-type', typeId: 'second-result-type', id: 'Result',
      async: false, parameters: [], returnType: { type: 'void' },
    })
    const secondAction = node(9, {
      kind: 'action', comment: '', source: 'handler as $type.Result',
    })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [
        node(3, { kind: 'app', appId: 'first-app', id: 'first' }, [firstType, firstAction]),
        node(7, { kind: 'app', appId: 'second-app', id: 'second' }, [secondType, secondAction]),
      ]),
    ])

    expect(ReferenceGraph.build(root, firstType.id).references)
      .toEqual([expect.objectContaining({ sourceNodeId: firstAction.id })])
    expect(ReferenceGraph.build(root, secondType.id).references)
      .toEqual([expect.objectContaining({ sourceNodeId: secondAction.id })])
  })

  it('keeps owned Function Parameter dependencies internal instead of displaying self-dependencies', () => {
    const functionNode = node(2, {
      kind: 'function',
      id: 'double',
      signature: {
        mode: 'inline',
        definition: {
          async: false,
          parameters: [{
            parameterId: 'value-id',
            id: 'value',
            valueType: { type: 'number' },
            nullable: false,
          }],
          returnType: { valueType: { type: 'number' }, nullable: false },
        },
      },
      implementation: { mode: 'code', source: 'return value * 2' },
    })
    const root = node(1, { kind: 'project' }, [functionNode])
    const graph = ReferenceGraph.build(root, functionNode.id)

    expect(graph.references).toEqual([])
    expect(graph.dependencies).toEqual([])
    expect(ReferenceGraph.collectDependencies(root, [functionNode.id])).toContainEqual({
      sourceNodeId: functionNode.id,
      targetNodeId: functionNode.id,
      targetLabel: 'function-parameter.value',
    })
    expect(ReferenceGraph.collectSemanticDependencies(root)).toContainEqual({
      sourceNodeId: functionNode.id,
      sourceLabel: 'function#implementation',
      sourceType: 'expression',
      targetNodeId: functionNode.id,
      targetLabel: 'function-parameter.value',
    })
  })

  it('keeps separate Dependencies for multiple Parameters owned by one Function node', () => {
    const functionNode = node(2, {
      kind: 'function',
      id: 'sum',
      signature: {
        mode: 'inline',
        definition: {
          async: false,
          parameters: [
            {
              parameterId: 'left-id', id: 'left',
              valueType: { type: 'number' }, nullable: false,
            },
            {
              parameterId: 'right-id', id: 'right',
              valueType: { type: 'number' }, nullable: false,
            },
          ],
          returnType: { valueType: { type: 'number' }, nullable: false },
        },
      },
      implementation: { mode: 'code', source: 'return left + right' },
    })
    const root = node(1, { kind: 'project' }, [functionNode])

    expect(ReferenceGraph.collectDependencies(root, [functionNode.id])).toEqual([
      {
        sourceNodeId: functionNode.id,
        targetNodeId: functionNode.id,
        targetLabel: 'function-parameter.left',
      },
      {
        sourceNodeId: functionNode.id,
        targetNodeId: functionNode.id,
        targetLabel: 'function-parameter.right',
      },
    ])
    expect(ReferenceGraph.build(root, functionNode.id).dependencies).toEqual([])
  })

  it('displays a Procedure statement dependency on its owning Function Parameter', () => {
    const action = node(4, {
      kind: 'action', comment: '', source: '$args.value + 1',
    })
    const functionNode = node(2, {
      kind: 'function',
      id: 'calculate',
      signature: {
        mode: 'inline',
        definition: {
          async: false,
          parameters: [{
            parameterId: 'value-id', id: 'value',
            valueType: { type: 'number' }, nullable: false,
          }],
          returnType: null,
        },
      },
      implementation: { mode: 'procedure' },
    }, [node(3, { kind: 'function-procedure' }, [action])])
    const root = node(1, { kind: 'project' }, [functionNode])

    expect(ReferenceGraph.build(root, functionNode.id).dependencies).toEqual([])
    expect(ReferenceGraph.build(root, action.id).dependencies).toContainEqual({
      sourceNodeId: action.id,
      targetNodeId: functionNode.id,
      targetLabel: 'function-parameter.value',
    })
  })

  it('displays a Refer Function dependency on its Signature definition', () => {
    const signature = node(2, {
      kind: 'signature-type', typeId: 'handler-signature', id: 'Handler',
      async: false, parameters: [], returnType: null,
    })
    const functionNode = node(3, {
      kind: 'function', id: 'handle',
      signature: { mode: 'refer', signatureTypeId: 'handler-signature' },
      implementation: { mode: 'procedure' },
    })
    const root = node(1, { kind: 'project' }, [signature, functionNode])

    expect(ReferenceGraph.build(root, functionNode.id).dependencies).toContainEqual({
      sourceNodeId: functionNode.id,
      targetNodeId: signature.id,
      targetLabel: 'signature-type.Handler',
    })
  })

  it('resolves same-named Function references within the source App scope', () => {
    const createFunction = (id: number) => node(id, {
      kind: 'function',
      id: 'run',
      signature: {
        mode: 'inline',
        definition: { async: false, parameters: [], returnType: null },
      },
      implementation: { mode: 'code', source: 'return undefined' },
    })
    const firstFunction = createFunction(5)
    const secondFunction = createFunction(15)
    const firstCall = node(8, { kind: 'action', comment: '', source: '$fn.run()' })
    const secondCall = node(18, { kind: 'action', comment: '', source: '$fn.run()' })
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'app', appId: 'first-app', id: 'first' }, [
        node(3, { kind: 'declares' }, [
          node(4, { kind: 'functions' }, [firstFunction]),
        ]),
        firstCall,
      ]),
      node(12, { kind: 'app', appId: 'second-app', id: 'second' }, [
        node(13, { kind: 'declares' }, [
          node(14, { kind: 'functions' }, [secondFunction]),
        ]),
        secondCall,
      ]),
    ])

    expect(ReferenceGraph.build(root, firstFunction.id).references)
      .toEqual([expect.objectContaining({ sourceNodeId: firstCall.id })])
    expect(ReferenceGraph.build(root, secondFunction.id).references)
      .toEqual([expect.objectContaining({ sourceNodeId: secondCall.id })])
  })
})
