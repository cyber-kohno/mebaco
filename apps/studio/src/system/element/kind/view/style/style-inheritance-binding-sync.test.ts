import { beforeEach, describe, expect, it } from 'vitest'
import StyleFixture from '../../../../test-support/style-fixture'
import type TreeNode from '../../../../tree/tree-node'
import StyleInheritanceBindingSync from './style-inheritance-binding-sync'
import type TagElement from '../tag/tag-element'

const tag = (
  styleId: string,
  arguments_: TagElement.StyleArgument[],
): TreeNode.Node => StyleFixture.node({
  kind: 'tag',
  tagName: 'div',
  comment: '',
  styles: [{
    referenceId: `application:${styleId}`,
    styleId: StyleFixture.styleId(styleId),
    arguments: arguments_,
  }],
  attributes: [],
})

const clone = (node: TreeNode.Node): TreeNode.Node => structuredClone(node)

const getStyle = (
  root: TreeNode.Node,
  styleId: string,
): Extract<TreeNode.Node['element'], { kind: 'style' }> => {
  let result: Extract<TreeNode.Node['element'], { kind: 'style' }> | null = null
  const visit = (node: TreeNode.Node) => {
    if (node.element.kind === 'style' && node.element.styleId === StyleFixture.styleId(styleId)) {
      result = node.element
    }
    node.children.forEach(visit)
  }
  visit(root)
  if (result == null) throw new Error(`Style '${styleId}' was not found.`)
  return result
}

const getTag = (
  root: TreeNode.Node,
): Extract<TreeNode.Node['element'], { kind: 'tag' }> => {
  let result: Extract<TreeNode.Node['element'], { kind: 'tag' }> | null = null
  const visit = (node: TreeNode.Node) => {
    if (node.element.kind === 'tag') result = node.element
    node.children.forEach(visit)
  }
  visit(root)
  if (result == null) throw new Error('Tag was not found.')
  return result
}

describe('StyleInheritanceBindingSync', () => {
  beforeEach(StyleFixture.resetNodeIds)

  it('adds resolved bindings to direct references when inheritance exposes a parameter', () => {
    const base = StyleFixture.style('base', {
      parameters: [StyleFixture.parameter('width', 'number', 10)],
    })
    const owner = StyleFixture.style('owner')
    const derived = StyleFixture.style('derived', {
      bases: [StyleFixture.base('owner')],
    })
    const application = tag('owner', [])
    const previousRoot = StyleFixture.project([base, owner, derived, application])
    const nextRoot = clone(previousRoot)
    const nextOwner = getStyle(nextRoot, 'owner')
    nextOwner.bases = [StyleFixture.base('base', { width: { type: 'delegate' } })]

    const result = StyleInheritanceBindingSync.update(previousRoot, nextRoot, owner.id)

    expect(getStyle(nextRoot, 'derived').bases[0]?.arguments).toEqual([{
      parameterId: StyleFixture.parameterId('width'),
      binding: { type: 'default' },
    }])
    expect(getTag(nextRoot).styles[0]?.arguments).toEqual([{
      parameterId: StyleFixture.parameterId('width'),
      binding: { type: 'default' },
    }])
    expect(result.contractChangedStyleIds).toEqual([StyleFixture.styleId('owner')])
  })

  it('removes a delegated parameter through every downstream contract', () => {
    const base = StyleFixture.style('base', {
      parameters: [StyleFixture.parameter('width', 'number', 10)],
    })
    const owner = StyleFixture.style('owner', {
      bases: [StyleFixture.base('base', { width: { type: 'delegate' } })],
    })
    const derived = StyleFixture.style('derived', {
      bases: [StyleFixture.base('owner', { width: { type: 'delegate' } })],
    })
    const application = tag('derived', [{
      parameterId: StyleFixture.parameterId('width'),
      binding: { type: 'default' },
    }])
    const previousRoot = StyleFixture.project([base, owner, derived, application])
    const nextRoot = clone(previousRoot)
    const nextOwner = getStyle(nextRoot, 'owner')
    nextOwner.bases[0].arguments = [{
      parameterId: StyleFixture.parameterId('width'),
      binding: { type: 'default' },
    }]

    const result = StyleInheritanceBindingSync.update(previousRoot, nextRoot, owner.id)

    expect(getStyle(nextRoot, 'derived').bases[0]?.arguments).toEqual([])
    expect(getTag(nextRoot).styles[0]?.arguments).toEqual([])
    expect(result.contractChangedStyleIds).toEqual([
      StyleFixture.styleId('owner'),
      StyleFixture.styleId('derived'),
    ])
  })

  it('replaces same-named parameters by UUID and rejects sparse previous structures', () => {
    const firstBase = StyleFixture.style('first-base', {
      parameters: [StyleFixture.parameter('color', 'color', '#ffffff')],
    })
    const secondParameter = StyleFixture.parameter('color', 'color', '#000000')
    secondParameter.parameterId = 'parameter:replacement-color'
    const secondBase = StyleFixture.style('second-base', { parameters: [secondParameter] })
    const owner = StyleFixture.style('owner', {
      bases: [StyleFixture.base('first-base', { color: { type: 'delegate' } })],
    })
    const application = tag('owner', [{
      parameterId: StyleFixture.parameterId('color'),
      binding: { type: 'default' },
    }])
    const previousRoot = StyleFixture.project([firstBase, secondBase, owner, application])
    const nextRoot = clone(previousRoot)
    const nextOwner = getStyle(nextRoot, 'owner')
    nextOwner.bases = [{
      ...StyleFixture.base('second-base'),
      arguments: [{
        parameterId: 'parameter:replacement-color',
        binding: { type: 'delegate' },
      }],
    }]

    StyleInheritanceBindingSync.update(previousRoot, nextRoot, owner.id)
    expect(getTag(nextRoot).styles[0]?.arguments).toEqual([{
      parameterId: 'parameter:replacement-color',
      binding: { type: 'default' },
    }])

    const malformedRoot = clone(previousRoot)
    getStyle(malformedRoot, 'owner').bases[0].arguments = []
    expect(() => StyleInheritanceBindingSync.update(malformedRoot, nextRoot, owner.id))
      .toThrowError(/invalid parameter contract/)
  })
})
