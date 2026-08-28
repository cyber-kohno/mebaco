import { describe, expect, it } from 'vitest'
import ReferenceGraph from './reference-graph'
import type TreeNode from '../tree/tree-node'

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

  it('collects app references from system transitions', () => {
    const app = node(2, { kind: 'app', appId: 'app-uuid', id: 'detail' })
    const action = node(3, {
      kind: 'action',
      comment: '',
      source: "$system.transition('detail', {})",
    })
    const root = node(1, { kind: 'project' }, [app, action])

    expect(ReferenceGraph.build(root, app.id).references).toEqual([{
      sourceNodeId: action.id,
      sourceLabel: 'action#source',
      targetNodeId: app.id,
      targetLabel: 'app.detail',
      sourceType: 'expression',
    }])
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
      bases: [{ referenceId: 'base-ref', styleId: 'base-style', arguments: [] }],
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
})
