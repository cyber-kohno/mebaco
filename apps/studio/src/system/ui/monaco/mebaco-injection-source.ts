import type StateElement from '../../element/kind/variable/store/state-element'
import StateScope from '../../element/kind/variable/store/state-scope'
import type TreeNode from '../../tree/tree-node'
import type StyleParamElement from '../../element/kind/view/style/style-param-element'
import StyleParameterCatalog from '../../element/kind/view/style/style-parameter-catalog'
import MonacoInjection from './monaco-injection'
import TypeCatalog from '../../element/kind/type/type-catalog'
import TypeExpression from '../../element/kind/type/type-expression'
import type ValuePropElement from '../../element/kind/component/definition/value-prop-element'
import ExpressionTypeInference from '../../element/kind/type/expression-type-inference'
import ContentHost from '../../element/content-host'
import FunctionScope from '../../element/kind/function/function-scope'
import ValueTypeDefinition from '../../element/kind/type/value-type-definition'
import type LaunchArgumentElement from '../../element/kind/app/launch/launch-argument-element'
import FunctionDefinition from '../../element/kind/function/function-definition'
import AppId from '../../element/kind/app/app-id'
import StyleLocalScope from '../../element/kind/view/style/style-local-scope'
import TransitionImportCatalog from '../../element/kind/app/import/transition-import-catalog'
import SequentialVariableScope from '../../element/kind/variable/sequential-variable-scope'
import type DirectoryResourceElement from '../../element/kind/resource/directory-resource-element'
import type TextResourceElement from '../../element/kind/resource/text-resource-element'
import type SqliteResourceElement from '../../element/kind/resource/sqlite-resource-element'

namespace MebacoInjectionSource {
  export type CreateOptions = {
    includeTargetScope?: boolean
    eventType?: string
    includeObjectPropertyIdentityMarkers?: boolean
  }

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

  const getLaunchArguments = (
    ownerAppNode: TreeNode.Node | null,
  ): LaunchArgumentElement.Element[] => {
    const argumentsNode = ownerAppNode?.children
      .find((child) => child.element.kind === 'launch-options')
      ?.children.find((child) => child.element.kind === 'launch-arguments')
    return argumentsNode?.children
      .map((child) => child.element)
      .filter((element): element is LaunchArgumentElement.Element => element.kind === 'launch-argument')
      ?? []
  }

  const collectScopedStates = (
    targetNode: TreeNode.Node | null,
    rootNode: TreeNode.Node,
  ): StateElement.Element[] => targetNode == null
    ? []
    : StateScope.collectVisible(rootNode, targetNode.id)
        .map((entry) => entry.element)

  const getValueType = (
    state: Pick<StateElement.Element, 'valueType' | 'nullable'>,
    rootNode: TreeNode.Node,
  ): string => `${TypeExpression.getTypeText(
    state.valueType,
    (typeId) => TypeCatalog.resolveTypeScriptName(rootNode, typeId),
  )}${state.nullable ? ' | null' : ''}`

  const createStateDeclaration = (
    states: readonly StateElement.Element[],
    rootNode: TreeNode.Node,
  ): string | null => {
    if (states.length === 0) return null

    const fields = states
      .map((state) => `  ${state.id}: ${getValueType(state, rootNode)};`)
      .join('\n')

    return [
      'declare var $state: {',
      fields,
      '};',
    ].join('\n')
  }

  const createLaunchDeclaration = (
    argumentsList: readonly LaunchArgumentElement.Element[],
    rootNode: TreeNode.Node,
  ): string | null => {
    if (argumentsList.length === 0) return null
    const fields = argumentsList.map((argument) => `  ${argument.id}: ${getValueType(argument, rootNode)};`)
    return ['declare var $launch: {', ...fields, '};'].join('\n')
  }

  const createTransitionDeclaration = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): string | null => {
    const ownerAppNode = findOwnerApp(rootNode, targetNodeId)
    const targetApps = ownerAppNode == null
      ? []
      : TransitionImportCatalog.getImportedApps(rootNode, ownerAppNode)
    if (targetApps.length === 0) return null

    const accessors = new Set<string>()
    const methods = targetApps.map((appNode) => {
      const appId = appNode.element.kind === 'app' ? appNode.element.id : ''
      const accessor = AppId.toTransitionAccessor(appId)
      if (accessors.has(accessor)) {
        throw new Error(`Duplicate transition accessor '${accessor}'.`)
      }
      accessors.add(accessor)
      const launchArguments = getLaunchArguments(appNode)
      const fields = launchArguments.map((argument) => (
        `    ${argument.id}${argument.defaultValue != null || argument.nullable ? '?' : ''}: ${getValueType(argument, rootNode)};`
      ))
      if (fields.length === 0) return `  ${accessor}(): void;`
      const launchValuesType = ['{', ...fields, '  }'].join('\n')
      const optional = launchArguments.every((argument) => (
        argument.defaultValue != null || argument.nullable
      ))
      return `  ${accessor}(launchValues${optional ? '?' : ''}: ${launchValuesType}): void;`
    })

    return ['declare var $transition: {', ...methods, '};'].join('\n')
  }

  type ResourceElement =
    | DirectoryResourceElement.Element
    | TextResourceElement.Element
    | SqliteResourceElement.Element

  const collectResources = (
    rootNode: TreeNode.Node,
  ): ResourceElement[] => {
    const resources: ResourceElement[] = []
    const collect = (node: TreeNode.Node) => {
      if (
        node.element.kind === 'directory-resource'
        || node.element.kind === 'text-resource'
        || node.element.kind === 'sqlite-resource'
      ) {
        resources.push(node.element)
      }
      node.children.forEach(collect)
    }
    collect(rootNode)
    return resources
  }

  const getTextResourceType = (
    access: 'read' | 'read-write',
  ): string => access === 'read-write'
    ? '$MebacoWritableTextResource'
    : '$MebacoReadonlyTextResource'

  const createDirectoryResourceType = (
    resource: DirectoryResourceElement.Element,
  ): string => {
    const methods = [
      '    exists(relativePath: string): Promise<boolean>;',
      '    list(relativePath?: string): Promise<$MebacoDirectoryEntry[]>;',
      '    glob(pattern: string): Promise<$MebacoDirectoryEntry[]>;',
    ]

    if (resource.permissions.access === 'read-write') {
      methods.push(
        '    renameFile(sourceRelativePath: string, destinationRelativePath: string): Promise<void>;',
        '    copyFile(sourceRelativePath: string, destinationRelativePath: string): Promise<void>;',
        '    createDir(relativePath: string): Promise<void>;',
        '    createFile(relativePath: string): Promise<void>;',
      )
      if (resource.permissions.deleteFile) {
        methods.push('    deleteFile(relativePath: string): Promise<void>;')
      }
    }

    if (resource.permissions.text != null) {
      methods.push(
        `    text(relativePath: string): ${getTextResourceType(resource.permissions.text.access)};`,
      )
    }
    if (resource.permissions.sqlite != null) {
      methods.push('    sqlite(relativePath: string): $MebacoSqliteResource;')
    }

    return ['  {', ...methods, '  }'].join('\n')
  }

  const createResourceDeclaration = (
    rootNode: TreeNode.Node,
  ): string | null => {
    const resources = collectResources(rootNode)
    if (resources.length === 0) return null

    const fields = resources.map((resource) => {
      switch (resource.kind) {
        case 'directory-resource':
          return `  ${resource.id}: ${createDirectoryResourceType(resource)};`
        case 'text-resource':
          return `  ${resource.id}: ${getTextResourceType(resource.access)};`
        case 'sqlite-resource':
          return `  ${resource.id}: $MebacoSqliteResource;`
      }
    })

    return [
      "type $MebacoTextEncoding = 'utf8';",
      'type $MebacoDirectoryEntry = {',
      '  readonly name: string;',
      '  readonly relativePath: string;',
      "  readonly kind: 'file' | 'directory';",
      '};',
      'interface $MebacoReadonlyTextResource {',
      '  read(encoding?: $MebacoTextEncoding): Promise<string>;',
      '}',
      'interface $MebacoWritableTextResource extends $MebacoReadonlyTextResource {',
      '  write(text: string, encoding?: $MebacoTextEncoding): Promise<void>;',
      '}',
      'interface $MebacoSqliteResource {',
      '  open(): Promise<{}>;',
      '}',
      'declare var $resource: {',
      ...fields,
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
  ): string | null => {
    if (props.length === 0) return null

    const fields = props
      .map((prop) => {
        const typeText = TypeExpression.getTypeText(
          prop.valueType,
          (typeId) => TypeCatalog.resolveTypeScriptName(rootNode, typeId),
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
    if (node == null) return []
    const styleNode = StyleLocalScope.findOwnerStyle(rootNode, node.id)
    if (styleNode?.element.kind !== 'style') return []

    return StyleParameterCatalog.createCatalog(rootNode)
      .resolve(styleNode.element.styleId)
      .parameters
      .map((parameter) => ({
        id: parameter.id,
        valueType: parameter.valueType,
      }))
  }

  const createStyleParameterDeclaration = (
    parameters: readonly Pick<StyleParamElement.Element, 'id' | 'valueType'>[],
  ): string | null => {
    if (parameters.length === 0) return null

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

  const getFunctionValueTypeText = (
    rootNode: TreeNode.Node,
    valueType: TypeExpression.Expression,
    nullable: boolean,
  ): string => `${TypeExpression.getTypeText(
    valueType,
    (typeId) => TypeCatalog.resolveTypeScriptName(rootNode, typeId),
  )}${nullable ? ' | null' : ''}`

  const createArgumentsDeclaration = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): string | null => {
    const owner = FunctionScope.findOwnerFunction(rootNode, targetNodeId)
    if (owner == null) return null
    const fields = FunctionScope.getArguments(rootNode, owner.node).map((argument) => (
      `  ${argument.id}: ${getFunctionValueTypeText(
        rootNode,
        argument.valueType,
        argument.nullable,
      )};`
    ))
    if (fields.length === 0) return null
    return [
      'declare var $args: {',
      ...fields,
      '};',
    ].join('\n')
  }

  const createFunctionsDeclaration = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): string | null => {
    const fields = FunctionScope.collectVisibleFunctions(rootNode, targetNodeId)
      .map((entry) => {
        const parameters = FunctionScope.getArguments(rootNode, entry.node)
          .map((argument) => `${argument.id}: ${getFunctionValueTypeText(
            rootNode,
            argument.valueType,
            argument.nullable,
          )}`)
          .join(', ')
        const resolvedReturnTypeDefinition = FunctionDefinition.getReturnType(rootNode, entry.element)
        const resolvedReturnType = resolvedReturnTypeDefinition == null
          ? 'void'
          : ValueTypeDefinition.getTypeText(
              resolvedReturnTypeDefinition,
              (typeId) => TypeCatalog.resolveTypeScriptName(rootNode, typeId),
            )
        const returnType = FunctionDefinition.getAsync(rootNode, entry.element)
          ? `Promise<${resolvedReturnType}>`
          : resolvedReturnType
        return `  ${entry.element.id}(${parameters}): ${returnType};`
      })

    return fields.length === 0
      ? null
      : ['declare var $fn: {', ...fields, '};'].join('\n')
  }

  const createVariableDeclaration = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    includeTargetScope: boolean,
    baseDeclarations: readonly string[],
  ): string | null => {
    const path = findPath(rootNode, targetNodeId) ?? []
    const fields = new Map<string, { typeText: string; readonly: boolean }>()

    const createDeclaration = () => {
      if (fields.size === 0) return ''
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
          (id) => TypeCatalog.resolveTypeScriptName(rootNode, id),
        )}${node.element.typeSetting.nullable ? ' | null' : ''}`
      } else {
        const owner = FunctionScope.findOwnerFunction(rootNode, node.id)
        const allowAwait = owner != null
          && FunctionDefinition.getAsync(rootNode, owner.element)
        const inferredType = ExpressionTypeInference.inferType(
          [...baseDeclarations, createDeclaration()].join('\n'),
          node.element.source,
          node.element.binding === 'let',
          allowAwait,
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
      const nextNode = path[index + 1]

      if (
        node.element.kind === 'promise'
        && nextNode?.element.kind === 'promise-then'
        && node.element.resultType != null
      ) {
        fields.set(node.element.id, {
          typeText: ValueTypeDefinition.getTypeText(
            node.element.resultType,
            (id) => TypeCatalog.resolveTypeScriptName(rootNode, id),
          ),
          readonly: true,
        })
      }
      if (
        node.element.kind === 'promise-catch'
        && (!isTarget || includeTargetScope)
      ) {
        fields.set(node.element.id, { typeText: 'unknown', readonly: true })
      }

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

      const retentionNode = ContentHost.getRetentionNode(node)
      const elementsNode = ContentHost.getElementsNode(node)
      if (retentionNode != null && nextNode === elementsNode) {
        SequentialVariableScope.collectDeclarations(retentionNode.children)
          .forEach(({ node: variableNode }) => addVariable(variableNode))
      }
      SequentialVariableScope.collectPrecedingDeclarations(
        node,
        nextNode,
        isTarget && includeTargetScope,
      ).forEach(({ node: variableNode }) => addVariable(variableNode))
    })

    return fields.size === 0 ? null : createDeclaration()
  }

  const createStyleLocalDeclaration = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    includeTargetScope: boolean,
    baseDeclarations: readonly string[],
  ): string | null => {
    const fields = new Map<string, { typeText: string; readonly: boolean }>()
    const createDeclaration = () => {
      if (fields.size === 0) return ''
      return [
        'declare var $local: {',
        ...[...fields].map(([id, field]) => (
          `  ${field.readonly ? 'readonly ' : ''}${id}: ${field.typeText};`
        )),
        '};',
      ].join('\n')
    }

    StyleLocalScope.collectVisible(rootNode, targetNodeId, includeTargetScope)
      .forEach(({ element }) => {
        let typeText: string
        if (element.typeSetting.type === 'explicit') {
          typeText = `${TypeExpression.getTypeText(
            element.typeSetting.valueType,
            (id) => TypeCatalog.resolveTypeScriptName(rootNode, id),
          )}${element.typeSetting.nullable ? ' | null' : ''}`
        } else {
          const inferred = ExpressionTypeInference.inferType(
            [...baseDeclarations, createDeclaration()].join('\n'),
            element.source,
            false,
          )
          typeText = inferred.ok ? inferred.typeText : 'unknown'
        }
        fields.set(element.id, {
          typeText,
          readonly: true,
        })
      })

    return fields.size === 0 ? null : createDeclaration()
  }

  export const createForNodeWithOptions = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    mode: MonacoInjection.Mode,
    options: CreateOptions = {},
  ): string => {
    const targetNode = findNode(rootNode, targetNodeId)
    const ownerComponentNode = targetNode == null
      ? null
      : findOwnerComponent(rootNode, targetNode.id)
    const typeDeclarations = TypeCatalog.createTypeScriptDeclarations(
      rootNode,
      targetNodeId,
      {
        includeObjectPropertyIdentityMarkers:
          options.includeObjectPropertyIdentityMarkers === true,
      },
    )
    const stateDeclaration = createStateDeclaration(
      collectScopedStates(targetNode, rootNode),
      rootNode,
    )
    const launchDeclaration = createLaunchDeclaration(
      getLaunchArguments(findOwnerApp(rootNode, targetNodeId)),
      rootNode,
    )
    const transitionDeclaration = createTransitionDeclaration(rootNode, targetNodeId)
    const styleParameterDeclaration = createStyleParameterDeclaration(
      collectStyleParameters(rootNode, targetNode),
    )
    const declarations: Array<string | null> = [
      typeDeclarations,
      launchDeclaration,
      stateDeclaration,
      styleParameterDeclaration,
      createPropsDeclaration(collectValueProps(ownerComponentNode), rootNode),
      mode === 'code' ? null : createArgumentsDeclaration(rootNode, targetNodeId),
      createFunctionsDeclaration(rootNode, targetNodeId),
      mode === 'action' || mode === 'code'
        ? createResourceDeclaration(rootNode)
        : null,
      mode === 'action' ? transitionDeclaration : null,
      mode === 'action'
        ? [
            'declare var $system: {',
            '  getRef(refKey: string): HTMLElement | null;',
            ...(options.eventType != null
              ? ['  afterRender(callback: () => void): () => void;']
              : []),
            '};',
          ].join('\n')
        : null,
    ]

    const availableDeclarations = declarations.filter(
      (declaration): declaration is string => declaration != null && declaration.length > 0,
    )

    const variableDeclaration = createVariableDeclaration(
      rootNode,
      targetNodeId,
      options.includeTargetScope === true,
      availableDeclarations,
    )
    if (variableDeclaration != null) availableDeclarations.push(variableDeclaration)

    const styleLocalDeclaration = createStyleLocalDeclaration(
      rootNode,
      targetNodeId,
      options.includeTargetScope === true,
      availableDeclarations,
    )
    if (styleLocalDeclaration != null) availableDeclarations.push(styleLocalDeclaration)

    if (mode === 'action' && options.eventType != null) {
      availableDeclarations.push(`declare var $event: ${options.eventType};`)
    }

    return availableDeclarations.join('\n')
  }

  export const createForNode = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    mode: MonacoInjection.Mode,
    includeTargetScope = false,
    eventType?: string,
  ): string => createForNodeWithOptions(rootNode, targetNodeId, mode, {
    includeTargetScope,
    eventType,
  })
}

export default MebacoInjectionSource
