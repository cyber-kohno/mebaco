import { get } from 'svelte/store'
import { beforeEach, describe, expect, it } from 'vitest'
import TreeStore from '../../../store/tree-store'
import TreeNode from '../../../tree/tree-node'
import StyleElement from './style-element'
import StyleParamElement from './style-param-element'
import StyleParameterBindingSync from './style-parameter-binding-sync'
import TagElement from './tag-element'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

const getNode = (nodeId: number): TreeNode.Node => {
  const found = TreeNode.findNode(get(TreeStore.rootNode), nodeId)
  if (found == null) throw new Error(`node-${nodeId} was not found.`)
  return found
}

const getBase = (nodeId: number): StyleElement.Base => {
  const element = getNode(nodeId).element
  if (element.kind !== 'style') throw new Error(`node-${nodeId} is not a Style.`)
  const base = element.bases[0]
  if (base == null) throw new Error(`node-${nodeId} has no inherited Style.`)
  return base
}

const getApplication = (nodeId: number): TagElement.StyleApplication => {
  const element = getNode(nodeId).element
  if (element.kind !== 'tag') throw new Error(`node-${nodeId} is not a Tag.`)
  const style = element.styles[0]
  if (style == null) throw new Error(`node-${nodeId} has no applied Style.`)
  return style
}

describe('Style Parameter binding synchronization', () => {
  beforeEach(() => {
    TreeStore.replaceRoot(node(1, { kind: 'project' }, [
      node(2, StyleElement.create('base', [], [], 'base-style'), [
        node(3, { kind: 'style-params' }),
      ]),
      node(4, StyleElement.create('derived', [], [{
        referenceId: 'derived-base',
        styleId: 'base-style',
        arguments: [],
      }], 'derived-style')),
      node(5, TagElement.create('div', '', [{
        referenceId: 'direct-application',
        styleId: 'base-style',
        arguments: [],
      }])),
      node(6, TagElement.create('div', '', [{
        referenceId: 'derived-application',
        styleId: 'derived-style',
        arguments: [],
      }])),
    ]))
  })

  it('adds #000 for Color and does not leak a newly added parameter downstream', () => {
    TreeStore.addChild(3, StyleParamElement.create(
      'accent',
      'color',
      undefined,
      'accent-parameter',
    ))

    expect(getBase(4).arguments).toEqual([{
      parameterId: 'accent-parameter',
      binding: { type: 'value', value: { type: 'literal', value: '#000' } },
    }])
    expect(getApplication(5).arguments).toEqual(getBase(4).arguments)
    expect(getApplication(6).arguments).toEqual([])
  })

  it('uses Default when a newly added parameter defines one', () => {
    TreeStore.addChild(3, StyleParamElement.create(
      'width',
      'number',
      12,
      'width-parameter',
    ))

    expect(getBase(4).arguments).toEqual([{
      parameterId: 'width-parameter',
      binding: { type: 'default' },
    }])
    expect(getApplication(5).arguments).toEqual(getBase(4).arguments)
  })

  it('resets values after a type change while preserving Delegate', () => {
    const parameter = StyleParamElement.create(
      'accent',
      'color',
      undefined,
      'accent-parameter',
    )
    const root = TreeNode.clone(get(TreeStore.rootNode))
    const paramsNode = TreeNode.findNode(root, 3)
    const derived = TreeNode.findNode(root, 4)
    const directTag = TreeNode.findNode(root, 5)
    const derivedTag = TreeNode.findNode(root, 6)
    if (
      paramsNode == null
      || derived?.element.kind !== 'style'
      || directTag?.element.kind !== 'tag'
      || derivedTag?.element.kind !== 'tag'
    ) throw new Error('Fixture is invalid.')
    paramsNode.children.push(node(7, parameter))
    derived.element.bases[0].arguments = [{
      parameterId: parameter.parameterId,
      binding: { type: 'delegate' },
    }]
    directTag.element.styles[0].arguments = [{
      parameterId: parameter.parameterId,
      binding: { type: 'value', value: { type: 'literal', value: '#fff' } },
    }]
    derivedTag.element.styles[0].arguments = [{
      parameterId: parameter.parameterId,
      binding: { type: 'value', value: { type: 'formula', source: '$state.width' } },
    }]
    TreeStore.replaceRoot(root)

    TreeStore.updateElement(7, { ...parameter, valueType: 'number' })

    expect(getBase(4).arguments[0]?.binding).toEqual({ type: 'delegate' })
    expect(getApplication(5).arguments[0]?.binding).toEqual({
      type: 'value',
      value: { type: 'literal', value: 0 },
    })
    expect(getApplication(6).arguments[0]?.binding).toEqual({
      type: 'value',
      value: { type: 'literal', value: 0 },
    })
  })

  it('replaces Default when the parameter default is removed', () => {
    const parameter = StyleParamElement.create(
      'width',
      'number',
      10,
      'width-parameter',
    )
    TreeStore.addChild(3, parameter)
    const parameterNode = getNode(3).children[0]

    TreeStore.updateElement(parameterNode.id, { ...parameter, defaultValue: undefined })

    expect(getBase(4).arguments[0]?.binding).toEqual({
      type: 'value',
      value: { type: 'literal', value: 0 },
    })
    expect(getApplication(5).arguments[0]?.binding).toEqual(getBase(4).arguments[0]?.binding)
  })

  it('removes UUID arguments without changing surviving expressions', () => {
    const parameter = StyleParamElement.create(
      'accent',
      'color',
      undefined,
      'accent-parameter',
    )
    TreeStore.addChild(3, parameter)
    const parameterNode = getNode(3).children[0]
    const root = TreeNode.clone(get(TreeStore.rootNode))
    const baseStyle = TreeNode.findNode(root, 2)
    if (baseStyle?.element.kind !== 'style') throw new Error('Fixture is invalid.')
    baseStyle.element.rules = [{
      type: 'declaration',
      property: 'color',
      value: { type: 'formula', source: '$param.accent' },
    }]

    StyleParameterBindingSync.remove(root, [parameter.parameterId])

    const derived = TreeNode.findNode(root, 4)
    const directTag = TreeNode.findNode(root, 5)
    if (derived?.element.kind !== 'style' || directTag?.element.kind !== 'tag') {
      throw new Error('Fixture is invalid.')
    }
    expect(derived.element.bases[0]?.arguments).toEqual([])
    expect(directTag.element.styles[0]?.arguments).toEqual([])
    expect(baseStyle.element.rules).toEqual([{
      type: 'declaration',
      property: 'color',
      value: { type: 'formula', source: '$param.accent' },
    }])

    TreeStore.removeNode(parameterNode.id)
    expect(getBase(4).arguments).toEqual([])
    expect(getApplication(5).arguments).toEqual([])
  })

  it('cleans all UUID arguments when the Parameters folder is removed', () => {
    TreeStore.addChild(3, StyleParamElement.create(
      'accent',
      'color',
      undefined,
      'accent-parameter',
    ))
    TreeStore.addChild(3, StyleParamElement.create(
      'width',
      'number',
      undefined,
      'width-parameter',
    ))
    expect(getBase(4).arguments).toHaveLength(2)
    expect(getApplication(5).arguments).toHaveLength(2)

    TreeStore.removeNode(3)

    expect(getBase(4).arguments).toEqual([])
    expect(getApplication(5).arguments).toEqual([])
  })
})
