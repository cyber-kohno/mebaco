import { describe, expect, it } from 'vitest'
import type MebacoElement from '../../element/element'
import type TreeNode from '../../tree/tree-node'
import MebacoInjectionSource from './mebaco-injection-source'
import TypeExpression from '../../element/kind/type/type-expression'

const node = (
  id: number,
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

describe('MebacoInjectionSource Loop variables', () => {
  it('adds ancestor Loop bindings to $var', () => {
    const textNode = node(3, {
      kind: 'text',
      source: { type: 'formula', value: '$var.item' },
    })
    const loopNode = node(2, {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '["first"]',
      itemId: 'item',
      indexId: 'index',
    }, [textNode])
    const rootNode = node(1, { kind: 'project' }, [loopNode])

    const source = MebacoInjectionSource.createForNode(
      rootNode,
      textNode.id,
      'expression',
    )

    expect(source).toContain('item: string;')
    expect(source).toContain('index: number;')
  })

  it('includes the target Loop only while creating its child', () => {
    const loopNode = node(2, {
      kind: 'loop',
      mode: 'count',
      countSource: '2',
      indexId: 'i',
    })
    const rootNode = node(1, { kind: 'project' }, [loopNode])

    const ownSource = MebacoInjectionSource.createForNode(
      rootNode,
      loopNode.id,
      'expression',
    )
    const childSource = MebacoInjectionSource.createForNode(
      rootNode,
      loopNode.id,
      'expression',
      true,
    )

    expect(ownSource).not.toContain('i: number;')
    expect(childSource).toContain('i: number;')
  })

  it('infers a Collection item from the project State and Object declarations', () => {
    const textNode = node(5, {
      kind: 'text',
      source: { type: 'formula', value: '$var.user.name' },
    })
    const loopNode = node(4, {
      kind: 'loop',
      mode: 'collection',
      collectionSource: '$state.users',
      itemId: 'user',
      indexId: 'index',
    }, [textNode])
    const rootNode = node(1, { kind: 'project' }, [
      node(2, {
        kind: 'object-type',
        typeId: 'user-type',
        id: 'User',
        baseObjectIds: [],
        properties: [TypeExpression.createProperty(
          'name',
          TypeExpression.createPrimitive('string'),
        )],
      }),
      node(3, {
        kind: 'state',
        id: 'users',
        valueType: TypeExpression.wrapArray(
          TypeExpression.createReference(['user-type']),
          1,
        ),
        nullable: false,
        initial: { type: 'default' },
      }),
      loopNode,
    ])

    const source = MebacoInjectionSource.createForNode(
      rootNode,
      textNode.id,
      'expression',
    )

    expect(source).toContain('type User = {')
    expect(source).toContain('user: User;')
  })

  it('injects ordered Retention Variables with const and let bindings', () => {
    const textNode = node(6, {
      kind: 'text',
      source: { type: 'formula', value: '$var.label' },
    })
    const retentionNode = node(2, { kind: 'retention' }, [
      node(3, {
        kind: 'variable', id: 'count', binding: 'const',
        typeSetting: { type: 'inferred' }, source: '1',
      }),
      node(4, {
        kind: 'variable', id: 'label', binding: 'let',
        typeSetting: { type: 'explicit', valueType: TypeExpression.createPrimitive('string'), nullable: false },
        source: '`Count: ${$var.count}`',
      }),
    ])
    const tagNode = node(1, {
      kind: 'tag', tagName: 'div', comment: '', styles: [], attributes: [],
    }, [retentionNode, node(5, { kind: 'elements' }, [textNode])])

    const source = MebacoInjectionSource.createForNode(
      tagNode,
      textNode.id,
      'expression',
    )

    expect(source).toContain('readonly count: 1;')
    expect(source).toContain('label: string;')
  })

  it('only exposes earlier Variables while editing a Retention child', () => {
    const first = node(3, {
      kind: 'variable', id: 'first', binding: 'const',
      typeSetting: { type: 'inferred' }, source: '1',
    })
    const second = node(4, {
      kind: 'variable', id: 'second', binding: 'const',
      typeSetting: { type: 'inferred' }, source: '$var.first + 1',
    })
    const rootNode = node(1, { kind: 'project' }, [
      node(2, { kind: 'retention' }, [first, second]),
    ])

    const source = MebacoInjectionSource.createForNode(rootNode, second.id, 'expression')

    expect(source).toContain('readonly first: 1;')
    expect(source).not.toContain('readonly second:')
  })
})
