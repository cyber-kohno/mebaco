import { describe, expect, it } from 'vitest'
import type MebacoElement from '../../element/element'
import type TreeNode from '../../tree/tree-node'
import MebacoInjectionSource from './mebaco-injection-source'
import TypeExpression from '../../element/kind/type/type-expression'
import SignatureDefinition from '../../element/kind/type/signature/signature-definition'

const node = (
  id: number,
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

const inlineFunction = (
  id: string,
  definition: SignatureDefinition.Definition = SignatureDefinition.create(),
): MebacoElement.Element => ({
  kind: 'function',
  id,
  signature: { mode: 'inline', definition },
  implementation: { mode: 'procedure' },
})

const referFunction = (
  id: string,
  signatureTypeId: string,
): MebacoElement.Element => ({
  kind: 'function',
  id,
  signature: { mode: 'refer', signatureTypeId },
  implementation: { mode: 'procedure' },
})

describe('MebacoInjectionSource Loop variables', () => {
  it('does not inject App State while editing a Common Style', () => {
    const commonStyleNode = node(8, {
      kind: 'style',
      styleId: 'rect-style-id',
      id: 'rect',
      rules: [],
      bases: [],
    }, [
      node(9, { kind: 'style-params' }, [
        node(10, {
          kind: 'style-param',
          parameterId: 'width-parameter-id',
          id: 'width',
          valueType: 'number',
        }),
      ]),
    ])
    const rootNode = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [
        node(3, { kind: 'app', appId: 'main-common-app-id', id: 'main' }, [
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

    expect(source).not.toContain('declare var $state:')
    expect(source).toContain('width: number;')
    expect(source).not.toContain('data: Data;')
    expect(source).not.toContain('type Data')
  })

  it('injects color Style Parameters as strings', () => {
    const styleNode = node(2, {
      kind: 'style',
      styleId: 'button-style-id',
      id: 'button',
      rules: [],
      bases: [],
    }, [
      node(3, { kind: 'style-params' }, [
        node(4, {
          kind: 'style-param',
          parameterId: 'accent-parameter-id',
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

  it('injects ordered Style Locals and Style Parameters into their own scope', () => {
    const first = node(5, {
      kind: 'variable', id: 'first', binding: 'const',
      typeSetting: { type: 'explicit', valueType: { type: 'number' }, nullable: false },
      source: '$param.seed',
    })
    const second = node(6, {
      kind: 'variable', id: 'second', binding: 'const',
      typeSetting: { type: 'inferred' }, source: '$local.first + 1',
    })
    const styleNode = node(2, {
      kind: 'style', styleId: 'calculated-style-id', id: 'calculated', rules: [], bases: [],
    }, [
      node(3, { kind: 'style-params' }, [node(4, {
        kind: 'style-param', parameterId: 'seed-id', id: 'seed', valueType: 'number',
      })]),
      node(7, { kind: 'style-locals' }, [first, second]),
    ])
    const rootNode = node(1, { kind: 'project' }, [styleNode])

    const styleSource = MebacoInjectionSource.createForNode(
      rootNode,
      styleNode.id,
      'expression',
    )
    expect(styleSource).toContain('seed: number;')
    expect(styleSource).toContain('readonly first: number;')
    expect(styleSource).toContain('readonly second: number;')

    const secondSource = MebacoInjectionSource.createForNode(
      rootNode,
      second.id,
      'expression',
    )
    expect(secondSource).toContain('seed: number;')
    expect(secondSource).toContain('readonly first: number;')
    expect(secondSource).not.toContain('readonly second:')
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
    expect(source).toContain('afterRender(callback: () => void): () => void;')
  })

  it('does not inject an Event outside an event action', () => {
    const tagNode = node(2, {
      kind: 'tag',
      tagName: 'button',
      comment: '',
      styles: [],
      attributes: [],
    })
    const rootNode = node(1, { kind: 'project' }, [tagNode])

    const source = MebacoInjectionSource.createForNode(rootNode, tagNode.id, 'action')

    expect(source).not.toContain('declare var $event:')
    expect(source).toContain('getRef(refKey: string): HTMLElement | null;')
    expect(source).not.toContain('afterRender(callback: () => void)')
  })

  it('does not inject empty namespaces into expressions', () => {
    const tagNode = node(2, {
      kind: 'tag',
      tagName: 'div',
      comment: '',
      styles: [],
      attributes: [],
    })
    const rootNode = node(1, { kind: 'project' }, [tagNode])

    const source = MebacoInjectionSource.createForNode(rootNode, tagNode.id, 'expression')
    const namespaceRoots = [
      '$args',
      '$launch',
      '$state',
      '$param',
      '$props',
      '$var',
      '$fn',
      '$system',
      '$event',
    ]

    namespaceRoots.forEach((name) => expect(source).not.toContain(`declare var ${name}:`))
  })

  it('injects Launch Arguments and Component Props when available', () => {
    const textNode = node(10, {
      kind: 'text',
      source: { type: 'formula', value: '$launch.userId + $props.offset' },
    })
    const componentNode = node(7, { kind: 'component', componentId: 'main-component-id', id: 'Main' }, [
      node(8, { kind: 'props' }, [
        node(9, {
          kind: 'value-prop',
          propId: 'offset-prop',
          id: 'offset',
          valueType: TypeExpression.createPrimitive('number'),
          nullable: false,
        }),
      ]),
      node(11, { kind: 'elements' }, [textNode]),
    ])
    const rootNode = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [
        node(3, { kind: 'app', appId: 'main-app-id', id: 'main' }, [
          node(4, { kind: 'launch-options' }, [
            node(5, { kind: 'launch-arguments' }, [
              node(6, {
                kind: 'launch-argument',
                propId: 'user-id-prop-id',
                id: 'userId',
                valueType: TypeExpression.createPrimitive('string'),
                nullable: false,
              }),
            ]),
          ]),
          componentNode,
        ]),
      ]),
    ])

    const source = MebacoInjectionSource.createForNode(rootNode, textNode.id, 'expression')

    expect(source).toContain('declare var $launch: {\n  userId: string;\n};')
    expect(source).toContain('declare var $props: {\n  offset: number;\n};')
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

  it('injects Component-local States for nodes inside the component', () => {
    const textNode = node(9, {
      kind: 'text',
      source: { type: 'formula', value: '$state.localCount' },
    })
    const componentNode = node(3, { kind: 'component', componentId: 'main-local-component-id', id: 'Main' }, [
      node(4, { kind: 'props' }),
      node(5, { kind: 'store' }, [
        node(6, { kind: 'states' }, [
          node(7, {
            kind: 'state',
            id: 'localCount',
            valueType: TypeExpression.createPrimitive('number'),
            nullable: false,
            initial: { type: 'default' },
          }),
        ]),
      ]),
      node(8, { kind: 'retention' }),
      node(10, { kind: 'elements' }, [textNode]),
    ])
    const rootNode = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [
        node(11, { kind: 'app', appId: 'main-local-app-id', id: 'main' }, [componentNode]),
      ]),
    ])

    const source = MebacoInjectionSource.createForNode(rootNode, textNode.id, 'expression')

    expect(source).toContain('localCount: number;')
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
    expect(source).toContain('user: $type.User;')
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

describe('MebacoInjectionSource Function scope', () => {
  it('does not inject $args into a Function without Arguments', () => {
    const actionNode = node(5, { kind: 'action', comment: '', source: '' })
    const functionNode = node(2, inlineFunction('run'), [
      node(4, { kind: 'function-procedure' }, [actionNode]),
    ])
    const rootNode = node(1, { kind: 'project' }, [functionNode])

    const source = MebacoInjectionSource.createForNode(rootNode, actionNode.id, 'action')

    expect(source).not.toContain('declare var $args:')
    expect(source).toContain('declare var $system:')
  })

  it('injects arguments, async, and return type from a Refer Function Signature', () => {
    const actionNode = node(8, { kind: 'action', comment: '', source: '' })
    const referNode = node(6, referFunction('load', 'load-signature'), [
      node(7, { kind: 'function-procedure' }, [actionNode]),
    ])
    const rootNode = node(1, { kind: 'project' }, [
      node(2, { kind: 'common' }),
      node(3, { kind: 'apps' }, [
        node(4, { kind: 'app', appId: 'refer-app-id', id: 'app' }, [
          node(5, { kind: 'declares' }, [
            node(9, { kind: 'types' }, [
              node(10, {
                kind: 'signature-type', typeId: 'load-signature', id: 'LoadSignature',
                async: true,
                parameters: [{ parameterId: 'id-parameter', id: 'id', valueType: { type: 'string' }, nullable: false }],
                returnType: { valueType: { type: 'number' }, nullable: false },
              }),
            ]),
            node(11, { kind: 'functions' }, [referNode]),
          ]),
        ]),
      ]),
    ])

    const source = MebacoInjectionSource.createForNode(rootNode, actionNode.id, 'action')

    expect(source).toContain('declare var $args: {\n  id: string;\n};')
    expect(source).toContain('load(id: string): Promise<number>;')
  })

  it('injects typed Arguments and visible Function signatures', () => {
    const actionNode = node(11, { kind: 'action', comment: '', source: '' })
    const calculateNode = node(7, inlineFunction(
      'calculate',
      SignatureDefinition.create(
        false,
        [SignatureDefinition.createParameter('count', { type: 'number' }, false, 'count-id')],
        { valueType: { type: 'number' }, nullable: false },
      ),
    ), [
      node(10, { kind: 'function-procedure' }, [actionNode]),
    ])
    const loadNode = node(12, inlineFunction(
      'loadUser',
      SignatureDefinition.create(
        true,
        [SignatureDefinition.createParameter('id', { type: 'string' }, false, 'id-id')],
        {
          valueType: TypeExpression.createReference(['user-type']),
          nullable: true,
        },
      ),
    ), [
      node(15, { kind: 'function-procedure' }),
    ])
    const rootNode = node(1, { kind: 'project' }, [
      node(2, { kind: 'common' }),
      node(3, { kind: 'apps' }, [
        node(4, { kind: 'app', appId: 'inline-app-id', id: 'app' }, [
          node(5, { kind: 'declares' }, [
            node(6, { kind: 'types' }, [
              node(16, {
                kind: 'object-type',
                typeId: 'user-type',
                id: 'User',
                baseObjectIds: [],
                properties: [],
              }),
            ]),
            node(17, { kind: 'functions' }, [calculateNode, loadNode]),
          ]),
        ]),
      ]),
    ])

    const source = MebacoInjectionSource.createForNode(
      rootNode,
      actionNode.id,
      'action',
    )

    expect(source).toContain('declare var $args: {\n  count: number;\n};')
    expect(source).toContain('calculate(count: number): number;')
    expect(source).toContain('loadUser(id: string): Promise<$type.User | null>;')
  })

  it('injects preceding outer and local Procedure Variables', () => {
    const target = node(8, { kind: 'action', comment: '', source: '' })
    const inner = node(5, inlineFunction('inner'), [
      node(7, { kind: 'function-procedure' }, [
        node(9, {
          kind: 'variable', id: 'local', binding: 'const',
          typeSetting: { type: 'explicit', valueType: { type: 'number' }, nullable: false },
          source: '1',
        }),
        target,
      ]),
    ])
    const outer = node(2, inlineFunction('outer'), [
      node(4, { kind: 'function-procedure' }, [
        node(10, {
          kind: 'variable', id: 'captured', binding: 'let',
          typeSetting: { type: 'explicit', valueType: { type: 'string' }, nullable: false },
          source: "''",
        }),
        inner,
      ]),
    ])
    const rootNode = node(1, { kind: 'project' }, [outer])

    const source = MebacoInjectionSource.createForNode(rootNode, target.id, 'action')

    expect(source).toContain('captured: string;')
    expect(source).toContain('readonly local: number;')
  })

  it('injects typed transition accessors for other Apps in Actions only', () => {
    const target = node(8, { kind: 'action', comment: '', source: '' })
    const currentApp = node(3, { kind: 'app', appId: 'current-app-id', id: 'current-app' }, [target])
    const otherApp = node(20, { kind: 'app', appId: 'details-app-id', id: 'user-details' }, [
      node(21, { kind: 'launch-options' }, [
        node(22, { kind: 'launch-arguments' }, [
          node(23, {
            kind: 'launch-argument',
            propId: 'details-user-id-prop-id',
            id: 'userId',
            valueType: { type: 'number' },
            nullable: false,
          }),
        ]),
      ]),
    ])
    const rootNode = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [currentApp, otherApp]),
    ])

    const source = MebacoInjectionSource.createForNode(rootNode, target.id, 'action')

    expect(source).toContain(
      'declare var $transition: {\n  userDetails(launchValues: {\n    userId: number;\n  }): void;\n};',
    )
    expect(source).not.toContain('currentApp(')
    expect(MebacoInjectionSource.createForNode(rootNode, target.id, 'expression'))
      .not.toContain('$transition')
  })

  it('does not expose $args to Function Code', () => {
    const functionNode = node(2, inlineFunction(
      'run',
      SignatureDefinition.create(
        false,
        [SignatureDefinition.createParameter('value', { type: 'number' }, false, 'value-id')],
      ),
    ))
    const rootNode = node(1, { kind: 'project' }, [functionNode])

    const source = MebacoInjectionSource.createForNode(rootNode, functionNode.id, 'code')

    expect(source).not.toContain('declare var $args:')
  })

  it('makes defaulted and nullable transition arguments optional', () => {
    const target = node(8, { kind: 'action', comment: '', source: '' })
    const currentApp = node(3, { kind: 'app', appId: 'current-app-id', id: 'current-app' }, [target])
    const otherApp = node(20, { kind: 'app', appId: 'details-app-id', id: 'user-details' }, [
      node(21, { kind: 'launch-options' }, [
        node(22, { kind: 'launch-arguments' }, [
          node(23, {
            kind: 'launch-argument', propId: 'mode-prop-id', id: 'mode',
            valueType: { type: 'string' }, nullable: false,
            defaultValue: { type: 'literal', value: 'view' },
          }),
          node(24, {
            kind: 'launch-argument', propId: 'filter-prop-id', id: 'filter',
            valueType: { type: 'string' }, nullable: true,
          }),
        ]),
      ]),
    ])
    const rootNode = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [currentApp, otherApp]),
    ])

    const source = MebacoInjectionSource.createForNode(rootNode, target.id, 'action')

    expect(source).toContain(
      'userDetails(launchValues?: {\n    mode?: string;\n    filter?: string | null;\n  }): void;',
    )
  })

  it('does not inject transition when the current App has no peer App', () => {
    const target = node(4, { kind: 'action', comment: '', source: '' })
    const rootNode = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [node(3, { kind: 'app', appId: 'only-app-id', id: 'only' }, [target])]),
    ])

    const source = MebacoInjectionSource.createForNode(rootNode, target.id, 'action')

    expect(source).not.toContain('$transition')
  })
})
