import type MebacoElement from '../element/element'
import type StyleElement from '../element/kind/view/style-element'
import type StyleParamElement from '../element/kind/view/style-param-element'
import type TagElement from '../element/kind/view/tag-element'
import type TreeNode from '../tree/tree-node'

namespace StyleFixture {
  let nextNodeId = 1

  export const styleId = (id: string): string => `style:${id}`
  export const parameterId = (id: string): string => `parameter:${id}`

  export const resetNodeIds = () => {
    nextNodeId = 1
  }

  export const node = (
    element: MebacoElement.Element,
    children: TreeNode.Node[] = [],
  ): TreeNode.Node => ({
    id: nextNodeId++,
    element,
    isOpen: true,
    children,
  })

  export const project = (
    styles: TreeNode.Node[],
  ): TreeNode.Node => node({ kind: 'project' }, styles)

  export const parameter = (
    id: string,
    valueType: StyleParamElement.ValueType,
    defaultValue?: StyleParamElement.Literal,
  ): StyleParamElement.Element => ({
    kind: 'style-param',
    parameterId: parameterId(id),
    id,
    valueType,
    defaultValue,
  })

  export const style = (
    id: string,
    options: {
      rules?: StyleElement.Rule[]
      bases?: StyleElement.Base[]
      parameters?: StyleParamElement.Element[]
    } = {},
  ): TreeNode.Node => {
    const parameterNodes = options.parameters?.map((item) => node(item)) ?? []
    const children = parameterNodes.length === 0
      ? []
      : [node({ kind: 'style-params' }, parameterNodes)]

    return node({
      kind: 'style',
      styleId: styleId(id),
      id,
      rules: options.rules ?? [],
      bases: options.bases ?? [],
    }, children)
  }

  export const base = (
    styleId: string,
    bindings: Record<string, StyleElement.ArgumentBinding> = {},
    condition?: string,
  ): StyleElement.Base => ({
    referenceId: `${styleId}-${crypto.randomUUID()}`,
    styleId: StyleFixture.styleId(styleId),
    condition: condition == null
      ? undefined
      : { type: 'formula', source: condition },
    arguments: Object.entries(bindings).map(([parameterId, binding]) => ({
      parameterId: StyleFixture.parameterId(parameterId),
      binding,
    })),
  })

  export const literal = (
    property: string,
    value: string,
  ): StyleElement.DeclarationRule => ({
    type: 'declaration',
    property,
    value: { type: 'literal', value },
  })

  export const formula = (
    property: string,
    source: string,
  ): StyleElement.DeclarationRule => ({
    type: 'declaration',
    property,
    value: { type: 'formula', source },
  })

  export const state = (
    stateName: StyleElement.State,
    declarations: StyleElement.DeclarationRule[],
  ): StyleElement.StateRule => ({
    type: 'state',
    state: stateName,
    declarations,
  })

  export const application = (
    styleId: string,
    bindings: Record<string, TagElement.StyleArgumentBinding> = {},
    condition?: string,
  ): TagElement.StyleApplication => ({
    referenceId: `${styleId}-${crypto.randomUUID()}`,
    styleId: StyleFixture.styleId(styleId),
    condition: condition == null
      ? undefined
      : { type: 'formula', source: condition },
    arguments: Object.entries(bindings).map(([parameterId, binding]) => ({
      parameterId: StyleFixture.parameterId(parameterId),
      binding,
    })),
  })
}

export default StyleFixture
