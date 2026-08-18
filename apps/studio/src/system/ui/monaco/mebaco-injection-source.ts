import type StateElement from '../../element/kind/variable/store/state-element'
import type TreeNode from '../../tree/tree-node'
import type StyleParamElement from '../../element/kind/view/style-param-element'
import StyleResolver from '../../element/kind/view/style-resolver'
import MonacoInjection from './monaco-injection'
import TypeCatalog from '../../element/kind/type/type-catalog'
import TypeExpression from '../../element/kind/type/type-expression'
import type ValuePropElement from '../../element/kind/component/definition/value-prop-element'
import ExpressionTypeInference from '../../element/kind/type/expression-type-inference'
import ContentHost from '../../element/content-host'

namespace MebacoInjectionSource {
  const findNode = (
    node: TreeNode.Node,
    nodeId: number,
  ): TreeNode.Node | null => {
    if (node.id === nodeId) return node

    for (const child of node.children) {
      const found = findNode(child, nodeId)
      if (found != null) return found
    }

    return null
  }

  const findPath = (
    node: TreeNode.Node,
    nodeId: number,
    path: TreeNode.Node[] = [],
  ): TreeNode.Node[] | null => {
    const nextPath = [...path, node]
    if (node.id === nodeId) return nextPath

    for (const child of node.children) {
      const found = findPath(child, nodeId, nextPath)
      if (found != null) return found
    }
    return null
  }

  const findOwnerApp = (
    node: TreeNode.Node,
    targetNodeId: number,
    ownerAppNode: TreeNode.Node | null = null,
  ): TreeNode.Node | null => {
    const nextOwnerAppNode = node.element.kind === 'app'
      ? node
      : ownerAppNode

    if (node.id === targetNodeId) return nextOwnerAppNode

    for (const child of node.children) {
      const found = findOwnerApp(child, targetNodeId, nextOwnerAppNode)
      if (found != null) return found
    }

    return null
  }

  const findOwnerComponent = (
    node: TreeNode.Node,
    targetNodeId: number,
    ownerComponentNode: TreeNode.Node | null = null,
  ): TreeNode.Node | null => {
    const nextOwnerComponentNode = node.element.kind === 'component'
      ? node
      : ownerComponentNode

    if (node.id === targetNodeId) return nextOwnerComponentNode

    for (const child of node.children) {
      const found = findOwnerComponent(child, targetNodeId, nextOwnerComponentNode)
      if (found != null) return found
    }

    return null
  }

  const findOwnerCommon = (
    node: TreeNode.Node,
    targetNodeId: number,
    ownerCommonNode: TreeNode.Node | null = null,
  ): TreeNode.Node | null => {
    const nextOwnerCommonNode = node.element.kind === 'common'
      ? node
      : ownerCommonNode

    if (node.id === targetNodeId) return nextOwnerCommonNode

    for (const child of node.children) {
      const found = findOwnerCommon(child, targetNodeId, nextOwnerCommonNode)
      if (found != null) return found
    }

    return null
  }

  const getStatesFromStore = (
    ownerNode: TreeNode.Node,
  ): StateElement.Element[] => {
    const storeNode = ownerNode.children.find((child) => child.element.kind === 'store')
    const statesNode = storeNode?.children.find((child) => child.element.kind === 'states')
    return statesNode?.children
      .map((child) => child.element)
      .filter((element): element is StateElement.Element => element.kind === 'state')
      ?? []
  }

  const getDirectStates = (
    ownerNode: TreeNode.Node,
  ): StateElement.Element[] => ownerNode.children
    .map((child) => child.element)
    .filter((element): element is StateElement.Element => element.kind === 'state')

  const collectScopedStates = (
    targetNode: TreeNode.Node | null,
    rootNode: TreeNode.Node,
  ): StateElement.Element[] => {
    if (targetNode == null) return []

    const ownerAppNode = findOwnerApp(rootNode, targetNode.id)
    if (ownerAppNode == null) {
      const ownerCommonNode = findOwnerCommon(rootNode, targetNode.id)
      return ownerCommonNode == null ? getDirectStates(rootNode) : getStatesFromStore(ownerCommonNode)
    }

    const states = new Map<string, StateElement.Element>()
    getStatesFromStore(ownerAppNode).forEach((state) => states.set(state.id, state))
    const path = findPath(rootNode, targetNode.id) ?? []
    path
      .filter((node) => node.element.kind === 'component')
      .forEach((componentNode) => {
        getStatesFromStore(componentNode).forEach((state) => states.set(state.id, state))
      })
    return [...states.values()]
  }

  const getValueType = (
    state: StateElement.Element,
    rootNode: TreeNode.Node,
  ): string => `${TypeExpression.getTypeText(
    state.valueType,
    (typeId) => TypeCatalog.resolveTypeName(rootNode, typeId),
  )}${state.nullable ? ' | null' : ''}`

  const createStateDeclaration = (
    states: readonly StateElement.Element[],
    rootNode: TreeNode.Node,
  ): string => {
    if (states.length === 0) return 'declare var $state: Record<string, unknown>;'

    const fields = states
      .map((state) => `  ${state.id}: ${getValueType(state, rootNode)};`)
      .join('\n')

    return [
      'declare var $state: {',
      fields,
      '};',
    ].join('\n')
  }

  const collectValueProps = (
    componentNode: TreeNode.Node | null,
  ): ValuePropElement.Element[] => (
    componentNode?.children
      .find((child) => child.element.kind === 'props')
      ?.children
      .map((child) => child.element)
      .filter((element): element is ValuePropElement.Element => element.kind === 'value-prop')
    ?? []
  )

  const createPropsDeclaration = (
    props: readonly ValuePropElement.Element[],
    rootNode: TreeNode.Node,
  ): string => {
    if (props.length === 0) return 'declare var $props: Record<string, unknown>;'

    const fields = props
      .map((prop) => {
        const typeText = TypeExpression.getTypeText(
          prop.valueType,
          (typeId) => TypeCatalog.resolveTypeName(rootNode, typeId),
        )
        return `  ${prop.id}: ${typeText}${prop.nullable ? ' | null' : ''};`
      })
      .join('\n')

    return [
      'declare var $props: {',
      fields,
      '};',
    ].join('\n')
  }

  const collectStyleParameters = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node | null,
  ): Array<Pick<StyleParamElement.Element, 'id' | 'valueType'>> => {
    if (node?.element.kind !== 'style') return []

    return StyleResolver.createCatalog(rootNode)
      .resolve(node.element.id)
      .parameters
      .map((parameter) => ({
        id: parameter.parameterId,
        valueType: parameter.valueType,
      }))
  }

  const createStyleParameterDeclaration = (
    parameters: readonly Pick<StyleParamElement.Element, 'id' | 'valueType'>[],
  ): string => {
    if (parameters.length === 0) return 'declare var $param: Record<string, unknown>;'

    const fields = parameters
      .map((parameter) => (
        `  ${parameter.id}: ${parameter.valueType === 'color' ? 'string' : parameter.valueType};`
      ))
      .join('\n')

    return [
      'declare var $param: {',
      fields,
      '};',
    ].join('\n')
  }

  const createVariableDeclaration = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    includeTargetScope: boolean,
    baseDeclarations: readonly string[],
  ): string => {
    const path = findPath(rootNode, targetNodeId) ?? []
    const fields = new Map<string, { typeText: string; readonly: boolean }>()

    const createDeclaration = () => {
      if (fields.size === 0) return 'declare var $var: Record<string, unknown>;'
      return [
        'declare var $var: {',
        '  [key: string]: unknown;',
        ...[...fields].map(([id, field]) => (
          `  ${field.readonly ? 'readonly ' : ''}${id}: ${field.typeText};`
        )),
        '};',
      ].join('\n')
    }

    const addVariable = (node: TreeNode.Node) => {
      if (node.element.kind !== 'variable') return
      let typeText: string
      if (node.element.typeSetting.type === 'explicit') {
        typeText = `${TypeExpression.getTypeText(
          node.element.typeSetting.valueType,
          (id) => TypeCatalog.resolveTypeName(rootNode, id),
        )}${node.element.typeSetting.nullable ? ' | null' : ''}`
      } else {
        const inferredType = ExpressionTypeInference.inferType(
          [...baseDeclarations, createDeclaration()].join('\n'),
          node.element.source,
          node.element.binding === 'let',
        )
        typeText = inferredType.ok ? inferredType.typeText : 'unknown'
      }
      fields.set(node.element.id, {
        typeText,
        readonly: node.element.binding === 'const',
      })
    }

    path.forEach((node, index) => {
      const isTarget = index === path.length - 1
      if (node.element.kind === 'loop' && (!isTarget || includeTargetScope)) {
        if (node.element.mode === 'collection') {
          const inferred = ExpressionTypeInference.inferArrayItem(
            [...baseDeclarations, createDeclaration()].join('\n'),
            node.element.collectionSource,
          )
          fields.set(node.element.itemId, {
            typeText: inferred.ok ? inferred.itemTypeText : 'unknown',
            readonly: true,
          })
        }
        fields.set(node.element.indexId, { typeText: 'number', readonly: true })
      }

      const nextNode = path[index + 1]
      const retentionNode = ContentHost.getRetentionNode(node)
      const elementsNode = ContentHost.getElementsNode(node)
      if (retentionNode != null && nextNode === elementsNode) {
        retentionNode.children.forEach(addVariable)
      }
      if (node.element.kind === 'retention' && nextNode != null) {
        const childIndex = node.children.indexOf(nextNode)
        node.children.slice(0, childIndex).forEach(addVariable)
      }
    })

    return createDeclaration()
  }

  export const createForNode = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    mode: MonacoInjection.Mode,
    includeTargetScope = false,
    eventType?: string,
  ): string => {
    const targetNode = findNode(rootNode, targetNodeId)
    const ownerComponentNode = targetNode == null
      ? null
      : findOwnerComponent(rootNode, targetNode.id)
    const typeDeclarations = TypeCatalog.createTypeScriptDeclarations(
      rootNode,
      targetNodeId,
    )
    const stateDeclaration = createStateDeclaration(
      collectScopedStates(targetNode, rootNode),
      rootNode,
    )
    const styleParameterDeclaration = createStyleParameterDeclaration(
      collectStyleParameters(rootNode, targetNode),
    )
    const declarations = [
      typeDeclarations,
      stateDeclaration,
      styleParameterDeclaration,
      createPropsDeclaration(collectValueProps(ownerComponentNode), rootNode),
      'declare var $args: Record<string, unknown>;',
      'declare var $function: Record<string, unknown>;',
      mode === 'action'
        ? [
            'declare var $system: {',
            '  getRef(refKey: string): HTMLElement | null;',
            ...(eventType != null
              ? ['  afterRender(callback: () => void): () => void;']
              : []),
            '};',
          ].join('\n')
        : 'declare var $system: Record<string, unknown>;',
    ]

    declarations.push(createVariableDeclaration(
      rootNode,
      targetNodeId,
      includeTargetScope,
      declarations,
    ))

    if (mode === 'action') {
      declarations.push(`declare var $event: ${eventType ?? 'Event'};`)
    }

    return declarations.join('\n')
  }
}

export default MebacoInjectionSource
