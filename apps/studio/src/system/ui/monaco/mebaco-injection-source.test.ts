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
  it('does not inject App State while editing a Common Style', () => {
    const commonStyleNode = node(8, {
      kind: 'style',
      id: 'rect',
      rules: [],
      bases: [],
    }, [
      node(9, { kind: 'style-params' }, [
        node(10, {
          kind: 'style-param',
          id: 'width',
          valueType: 'number',
        }),
      ]),
    ])
    const rootNode = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [
        node(3, { kind: 'app', id: 'main' }, [
          node(4, { kind: 'store' }, [
            node(5, { kind: 'states' }, [
              node(6, {
                kind: 'state',
                id: 'data',
                valueType: TypeExpression.createReference(['data-type']),
                nullable: false,
                initial: { type: 'default' },
              }),
            ]),
          ]),
          node(7, {
            kind: 'object-type',
            typeId: 'data-type',
            id: 'Data',
            baseObjectIds: [],
            properties: [],
          }),
        ]),
      ]),
      node(11, { kind: 'common' }, [commonStyleNode]),
    ])

    const source = MebacoInjectionSource.createForNode(
      rootNode,
      commonStyleNode.id,
      'expression',
    )

    expect(source).toContain('declare var $state: Record<string, unknown>;')
    expect(source).toContain('width: number;')
    expect(source).not.toContain('data: Data;')
    expect(source).not.toContain('type Data')
  })

  it('injects color Style Parameters as strings', () => {
    const styleNode = node(2, {
      kind: 'style',
      id: 'button',
      rules: [],
      bases: [],
    }, [
      node(3, { kind: 'style-params' }, [
        node(4, {
          kind: 'style-param',
          id: 'accent',
          valueType: 'color',
          defaultValue: '#66ccff',
        }),
      ]),
    ])
    const rootNode = node(1, { kind: 'project' }, [styleNode])

    const source = MebacoInjectionSource.createForNode(rootNode, styleNode.id, 'expression')

    expect(source).toContain('accent: string;')
    expect(source).not.toContain('accent: color;')
  })

  it('injects a concrete action event type when provided', () => {
    const tagNode = node(2, {
      kind: 'tag',
      tagName: 'button',
      comment: '',
      styles: [],
      attributes: [],
    })
    const rootNode = node(1, { kind: 'project' }, [tagNode])

    const source = MebacoInjectionSource.createForNode(
      rootNode,
      tagNode.id,
      'action',
      false,
      'MouseEvent',
    )

    expect(source).toContain('declare var $event: MouseEvent;')
  })

  it('injects a generic Event for actions by default', () => {
    const tagNode = node(2, {
      kind: 'tag',
      tagName: 'button',
      comment: '',
      styles: [],
      attributes: [],
    })
    const rootNode = node(1, { kind: 'project' }, [tagNode])

    const source = MebacoInjectionSource.createForNode(rootNode, tagNode.id, 'action')

    expect(source).toContain('declare var $event: Event;')
  })

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
