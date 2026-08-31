import TypeScript from 'typescript'
import type MebacoElement from '../../element/element'
import type TreeNode from '../../tree/tree-node'
import DefinitionCatalog from '../../element/definition-catalog'
import StyleParameterCatalog from '../../element/kind/view/style/style-parameter-catalog'
import AppId from '../../element/kind/app/app-id'
import TransitionExpression from './transition-expression'
import ReferenceLanguage from './reference-language'
import ElementExpressionFields from './element-expression-fields'
import ExpressionReferenceSyntax from './expression-reference-syntax'
import TypeCatalog from '../../element/kind/type/type-catalog'
import FunctionDefinition from '../../element/kind/function/function-definition'
import FunctionScope from '../../element/kind/function/function-scope'
import StyleLocalScope from '../../element/kind/view/style/style-local-scope'

namespace ReferenceGraph {
  export type ReferenceSourceType = 'structural' | 'expression'

  export type Reference = {
    sourceNodeId: number
    sourceLabel: string
    targetNodeId: number
    targetLabel: string
    sourceType: ReferenceSourceType
  }

  export type Dependency = {
    sourceNodeId: number
    targetNodeId: number
    targetLabel: string
  }

  export type Result = {
    canHaveReferences: boolean
    canHaveDependencies: boolean
    references: readonly Reference[]
    dependencies: readonly Dependency[]
  }

  export type Snapshot = {
    select: (selectedNodeId: number) => Result
  }

  type Target = {
    nodeId: number
    kind: string
    label: string
    nameAliases: ReadonlySet<string>
    definitionAliases: ReadonlySet<string>
    canBeReferenced: boolean
    isLoopAlias: boolean
    propsScope: string | null
    ownerAppNodeId: number | null
  }

  type PropsScopes = {
    sources: ReadonlyMap<number, string>
    targets: ReadonlyMap<number, string>
  }

  type StyleParameterScopes = ReadonlyMap<number, ReadonlySet<number>>
  type StyleLocalScopes = ReadonlyMap<number, ReadonlySet<number>>

  type ReferenceKind = ReferenceLanguage.Kind

  const referenceKinds = ReferenceLanguage.structuralFields
  const expressionRoots = ReferenceLanguage.expressionRoots
  const jsonFields = ElementExpressionFields.referenceJson
  const expressionFields = ElementExpressionFields.direct

  const dependencyFields = new Set([
    ...jsonFields,
    ...expressionFields,
    ...Object.keys(referenceKinds),
  ])

  const getElementId = (element: MebacoElement.Element): string | null => {
    const candidate = element as unknown as { id?: unknown }
    return typeof candidate.id === 'string' && candidate.id.length > 0
      ? candidate.id
      : null
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

  const getTargetLabel = (
    element: MebacoElement.Element,
    alias?: string,
  ): string => `${element.kind}.${getElementId(element) ?? alias ?? '?'}`

  const createPropsScopes = (
    rootNode: TreeNode.Node,
  ): PropsScopes => {
    const sources = new Map<number, string>()
    const targets = new Map<number, string>()

    const visit = (
      node: TreeNode.Node,
      componentScope: string | null,
      slotScope: string | null,
      parentNode: TreeNode.Node | null,
      grandparentNode: TreeNode.Node | null,
    ) => {
      const nextComponentScope = node.element.kind === 'component'
        ? `component:${node.id}`
        : componentScope
      const nextSlotScope = node.element.kind === 'component'
        ? null
        : node.element.kind === 'slot-content'
          ? `slot:${node.element.slotId}`
          : slotScope
      const sourceScope = nextSlotScope ?? nextComponentScope
      if (sourceScope != null) sources.set(node.id, sourceScope)

      if (node.element.kind === 'value-prop' && parentNode?.element.kind === 'props') {
        if (grandparentNode?.element.kind === 'component') {
          targets.set(node.id, `component:${grandparentNode.id}`)
        } else if (grandparentNode?.element.kind === 'slot') {
          targets.set(node.id, `slot:${grandparentNode.element.slotId}`)
        }
      }

      node.children.forEach((child) => visit(
        child,
        nextComponentScope,
        nextSlotScope,
        node,
        parentNode,
      ))
    }
    visit(rootNode, null, null, null, null)
    return { sources, targets }
  }

  const createStyleParameterScopes = (
    rootNode: TreeNode.Node,
  ): StyleParameterScopes => {
    const targetNodeIds = new Map<string, number>()
    const collectTargets = (node: TreeNode.Node) => {
      if (node.element.kind === 'style-param') {
        targetNodeIds.set(node.element.parameterId, node.id)
      }
      node.children.forEach(collectTargets)
    }
    collectTargets(rootNode)

    const catalog = StyleParameterCatalog.createCatalog(rootNode)
    const sources = new Map<number, ReadonlySet<number>>()
    const visit = (
      node: TreeNode.Node,
      inheritedTargets: ReadonlySet<number>,
    ) => {
      const visibleTargets = node.element.kind === 'style'
        ? new Set(catalog.resolve(node.element.styleId).parameters
            .map((parameter) => targetNodeIds.get(parameter.parameterId))
            .filter((nodeId): nodeId is number => nodeId != null))
        : inheritedTargets
      sources.set(node.id, visibleTargets)
      node.children.forEach((child) => visit(child, visibleTargets))
    }
    visit(rootNode, new Set())
    return sources
  }

  const createStyleLocalScopes = (
    rootNode: TreeNode.Node,
  ): StyleLocalScopes => {
    const scopes = new Map<number, ReadonlySet<number>>()
    const visit = (node: TreeNode.Node) => {
      scopes.set(node.id, new Set(
        StyleLocalScope.collectVisible(rootNode, node.id).map((entry) => entry.node.id),
      ))
      node.children.forEach(visit)
    }
    visit(rootNode)
    return scopes
  }

  const collectTargets = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
    propsScopes: PropsScopes,
    result: Target[] = [],
    ownerAppNodeId: number | null = null,
  ): Target[] => {
    const element = node.element
    const nextOwnerAppNodeId = element.kind === 'app' ? node.id : ownerAppNodeId
    const nameAliases = new Set<string>()
    const definitionAliases = new Set<string>()
    const id = getElementId(element)
    if (id != null) nameAliases.add(id)
    if (element.kind === 'app' && id != null) {
      nameAliases.add(AppId.toTransitionAccessor(id))
    }

    const internalTypeId = (element as unknown as { typeId?: unknown }).typeId
    if (typeof internalTypeId === 'string') definitionAliases.add(internalTypeId)
    const definitionId = DefinitionCatalog.getDefinitionId(element)
    if (definitionId != null) definitionAliases.add(definitionId)

    if (element.kind === 'loop') {
      const loop = element as unknown as { itemId?: unknown; indexId?: unknown }
      if (typeof loop.itemId === 'string') nameAliases.add(loop.itemId)
      if (typeof loop.indexId === 'string') nameAliases.add(loop.indexId)
    }

    if (element.kind === 'loop') {
      nameAliases.forEach((alias) => {
        result.push({
          nodeId: node.id,
          kind: 'variable',
          label: `loop.${alias}`,
          nameAliases: new Set([alias]),
          definitionAliases: new Set(),
          canBeReferenced: false,
          isLoopAlias: true,
          propsScope: null,
          ownerAppNodeId: nextOwnerAppNodeId,
        })
      })
    } else if (nameAliases.size > 0 || definitionAliases.size > 0) {
      const firstAlias = id ?? [...definitionAliases][0]
      result.push({
        nodeId: node.id,
        kind: element.kind,
        label: getTargetLabel(element, firstAlias),
        nameAliases,
        definitionAliases,
        canBeReferenced: true,
        isLoopAlias: false,
        propsScope: propsScopes.targets.get(node.id) ?? null,
        ownerAppNodeId: nextOwnerAppNodeId,
      })
    }

    if (element.kind === 'function') {
      FunctionDefinition.getParameters(rootNode, element).forEach((parameter) => {
        result.push({
          nodeId: node.id,
          kind: 'function-parameter',
          label: `function-parameter.${parameter.id}`,
          nameAliases: new Set([parameter.id]),
          definitionAliases: new Set([parameter.parameterId]),
          canBeReferenced: false,
          isLoopAlias: false,
          propsScope: null,
          ownerAppNodeId: nextOwnerAppNodeId,
        })
      })
    }

    node.children.forEach((child) => collectTargets(
      rootNode,
      child,
      propsScopes,
      result,
      nextOwnerAppNodeId,
    ))
    return result
  }

  const getReferenceFieldName = (
    element: MebacoElement.Element,
    path: readonly string[],
  ): string => {
    const key = path[0] ?? 'unknown'
    if (element.kind === 'tag' && key === 'attributes') return 'attribute'
    if (element.kind === 'tag' && key === 'styles') return 'style'
    if (element.kind === 'variable' && key === 'source') return 'initial'
    if (element.kind === 'state' && key === 'initial') return 'initial'
    if (element.kind === 'component-use' && key === 'propBindings') return 'prop'
    if (element.kind === 'slot-use' && key === 'propBindings') return 'prop'
    if (
      (element.kind === 'launcher' || element.kind === 'transition')
      && key === 'argumentBindings'
    ) return 'argument'
    return key.replace(/Source$/, '') || 'expression'
  }

  const getExpressionFieldName = (
    element: MebacoElement.Element,
    path: readonly string[],
  ): string => getReferenceFieldName(element, path)

  const isObject = (value: unknown): value is Record<string, unknown> => (
    value != null && typeof value === 'object' && !Array.isArray(value)
  )

  const parseJson = (value: string): unknown => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }

  const getCandidates = (
    targets: readonly Target[],
    value: string,
    kinds: readonly ReferenceKind[] | undefined,
    visibleLoopTargets: readonly Target[] = [],
    aliasType: 'name' | 'definition' = 'definition',
  ): readonly Target[] => {
    const hasAlias = (target: Target): boolean => (
      aliasType === 'name'
        ? target.nameAliases.has(value)
        : target.definitionAliases.has(value)
    )
    const globalTargets = targets.filter((target) => (
      !target.isLoopAlias
      && (kinds == null || kinds.includes(target.kind as ReferenceKind))
      && hasAlias(target)
    ))
    const scopedTarget = [...visibleLoopTargets].reverse().find((target) => (
      (kinds == null || kinds.includes(target.kind as ReferenceKind))
      && hasAlias(target)
    ))
    return scopedTarget == null ? globalTargets : [...globalTargets, scopedTarget]
  }

  const createEdgeKey = (
    sourceNodeId: number,
    sourceLabel: string,
    target: Target,
  ) => `${sourceNodeId}:${sourceLabel}:${target.nodeId}:${target.label}`

  const addReference = (
    references: Map<string, Reference>,
    dependencies: Map<string, Dependency>,
    sourceNode: TreeNode.Node,
    sourceLabel: string,
    target: Target,
    sourceType: ReferenceSourceType,
  ) => {
    const formattedSourceLabel = `${sourceNode.element.kind}#${sourceLabel}`
    const dependencyKey = createEdgeKey(sourceNode.id, formattedSourceLabel, target)
    if (target.canBeReferenced) {
      references.set(`${dependencyKey}:${sourceType}`, {
        sourceNodeId: sourceNode.id,
        sourceLabel: formattedSourceLabel,
        targetNodeId: target.nodeId,
        targetLabel: target.label,
        sourceType,
      })
    }
    dependencies.set(dependencyKey, {
      sourceNodeId: sourceNode.id,
      targetNodeId: target.nodeId,
      targetLabel: target.label,
    })
  }

  const analyzeExpression = (
    rootNode: TreeNode.Node,
    source: string,
    sourceNode: TreeNode.Node,
    sourceLabel: string,
    targets: readonly Target[],
    visibleLoopTargets: readonly Target[],
    propsScope: string | null,
    styleParameterTargetIds: ReadonlySet<number>,
    styleLocalTargetIds: ReadonlySet<number>,
    visibleTypeTargetIds: ReadonlySet<number>,
    references: Map<string, Reference>,
    dependencies: Map<string, Dependency>,
  ) => {
    if (source.trim().length === 0) return
    const sourceFile = TypeScript.createSourceFile(
      'mebaco-reference-expression.ts',
      source,
      TypeScript.ScriptTarget.Latest,
      true,
      TypeScript.ScriptKind.TS,
    )

    const resolveExpression = (root: string, property: string) => {
      const kinds = expressionRoots[root]
      if (kinds == null) return
      const candidates = root === '$fn'
        ? (() => {
            const resolved = FunctionScope.resolveFunction(
              rootNode,
              sourceNode.id,
              property,
            )
            return resolved == null
              ? []
              : targets.filter((target) => (
                  target.kind === 'function'
                  && target.nodeId === resolved.node.id
                ))
          })()
        : root === '$args'
        ? (() => {
            const owner = FunctionScope.findOwnerFunction(rootNode, sourceNode.id)
            return owner == null
              ? []
              : targets.filter((target) => (
                  target.kind === 'function-parameter'
                  && target.nodeId === owner.node.id
                  && target.nameAliases.has(property)
                ))
          })()
        : root === '$props'
        ? targets.filter((target) => (
            target.kind === 'value-prop'
            && target.propsScope != null
            && target.propsScope === propsScope
            && target.nameAliases.has(property)
          ))
        : root === '$param'
          ? targets.filter((target) => (
              target.kind === 'style-param'
              && styleParameterTargetIds.has(target.nodeId)
              && target.nameAliases.has(property)
            ))
        : root === '$local'
          ? targets.filter((target) => (
              target.kind === 'variable'
              && styleLocalTargetIds.has(target.nodeId)
              && target.nameAliases.has(property)
            ))
        : root === TypeCatalog.typeScriptNamespace
          ? targets.filter((target) => (
              visibleTypeTargetIds.has(target.nodeId)
              && kinds.includes(target.kind as ReferenceKind)
              && target.nameAliases.has(property)
            ))
        : getCandidates(targets, property, kinds, visibleLoopTargets, 'name')
      candidates
        .forEach((target) => addReference(
          references,
          dependencies,
          sourceNode,
          sourceLabel,
          target,
          'expression',
        ))
    }

    const isBareValueIdentifier = (node: TypeScript.Identifier): boolean => {
      const parent = node.parent
      if (TypeScript.isPropertyAccessExpression(parent) && parent.name === node) return false
      if (TypeScript.isPropertyAssignment(parent) && parent.name === node) return false
      if (TypeScript.isMethodDeclaration(parent) && parent.name === node) return false
      if (TypeScript.isPropertyDeclaration(parent) && parent.name === node) return false
      if (TypeScript.isVariableDeclaration(parent) && parent.name === node) return false
      if (TypeScript.isParameter(parent) && parent.name === node) return false
      if (TypeScript.isFunctionDeclaration(parent) && parent.name === node) return false
      if (TypeScript.isFunctionExpression(parent) && parent.name === node) return false
      if (TypeScript.isClassDeclaration(parent) && parent.name === node) return false
      if (TypeScript.isTypeReferenceNode(parent)) return false
      if (TypeScript.isTypeAliasDeclaration(parent)) return false
      if (TypeScript.isInterfaceDeclaration(parent)) return false
      if (TypeScript.isLabeledStatement(parent) && parent.label === node) return false
      if ((TypeScript.isBreakStatement(parent) || TypeScript.isContinueStatement(parent))
        && parent.label === node) return false
      return true
    }

    const resolveCodeParameter = (identifier: TypeScript.Identifier) => {
      if (
        sourceNode.element.kind !== 'function'
        || sourceNode.element.implementation.mode !== 'code'
        || !isBareValueIdentifier(identifier)
      ) return
      targets
        .filter((target) => (
          target.kind === 'function-parameter'
          && target.nodeId === sourceNode.id
          && target.nameAliases.has(identifier.text)
        ))
        .forEach((target) => addReference(
          references,
          dependencies,
          sourceNode,
          sourceLabel,
          target,
          'expression',
        ))
    }

    const visit = (node: TypeScript.Node) => {
      if (TypeScript.isCallExpression(node)) {
        const accessor = TransitionExpression.getAccessor(node)
        if (accessor != null) {
          const appTargets = getCandidates(targets, accessor, ['app'], [], 'name')
          appTargets.forEach((appTarget) => {
            TransitionExpression.getArgumentProperties(node).forEach((property) => {
              targets
                .filter((target) => (
                  target.kind === 'launch-argument'
                  && target.ownerAppNodeId === appTarget.nodeId
                  && target.nameAliases.has(property.id)
                ))
                .forEach((target) => addReference(
                  references,
                  dependencies,
                  sourceNode,
                  sourceLabel,
                  target,
                  'expression',
                ))
            })
          })
        }
      }
      const member = ExpressionReferenceSyntax.getMember(node)
      if (member != null) resolveExpression(member.root, member.id)
      if (TypeScript.isIdentifier(node)) resolveCodeParameter(node)

      TypeScript.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  const collectValue = (
    rootNode: TreeNode.Node,
    value: unknown,
    path: readonly string[],
    sourceNode: TreeNode.Node,
    targets: readonly Target[],
    visibleLoopTargets: readonly Target[],
    propsScope: string | null,
    styleParameterTargetIds: ReadonlySet<number>,
    styleLocalTargetIds: ReadonlySet<number>,
    visibleTypeTargetIds: ReadonlySet<number>,
    references: Map<string, Reference>,
    dependencies: Map<string, Dependency>,
    visited: Set<unknown>,
  ) => {
    if (value == null || typeof value === 'boolean' || typeof value === 'number') return
    if (typeof value === 'string') {
      const key = path[path.length - 1] ?? ''
      const parsed = jsonFields.has(key) ? parseJson(value) : null
      if (parsed != null) {
        collectValue(
          rootNode,
          parsed,
          path,
          sourceNode,
          targets,
          visibleLoopTargets,
          propsScope,
          styleParameterTargetIds,
          styleLocalTargetIds,
          visibleTypeTargetIds,
          references,
          dependencies,
          visited,
        )
      } else if (expressionFields.has(key)) {
        analyzeExpression(
          rootNode,
          value,
          sourceNode,
          getExpressionFieldName(sourceNode.element, path),
          targets,
          visibleLoopTargets,
          propsScope,
          styleParameterTargetIds,
          styleLocalTargetIds,
          visibleTypeTargetIds,
          references,
          dependencies,
        )
      }
      return
    }
    if (visited.has(value)) return
    visited.add(value)

    if (Array.isArray(value)) {
      value.forEach((item) => collectValue(
        rootNode,
        item,
        path,
        sourceNode,
        targets,
        visibleLoopTargets,
        propsScope,
        styleParameterTargetIds,
        styleLocalTargetIds,
        visibleTypeTargetIds,
        references,
        dependencies,
        visited,
      ))
      return
    }

    if (!isObject(value)) return
    const type = value.type
    if ((type === 'formula' || type === 'script') && typeof value.source === 'string') {
      analyzeExpression(
        rootNode,
        value.source,
        sourceNode,
        getExpressionFieldName(sourceNode.element, path),
        targets,
        visibleLoopTargets,
        propsScope,
        styleParameterTargetIds,
        styleLocalTargetIds,
        visibleTypeTargetIds,
        references,
        dependencies,
      )
    }

    Object.entries(value).forEach(([key, child]) => {
      if (key === 'id' || key === 'typeId' || key === 'referenceId') return
      if (
        typeof child === 'string'
        && child === DefinitionCatalog.getDefinitionId(sourceNode.element)
      ) return
      const kinds = referenceKinds[key]
      if (kinds != null) {
        const values = Array.isArray(child) ? child : [child]
        values
          .filter((candidate): candidate is string => typeof candidate === 'string')
          .forEach((candidate) => {
            getCandidates(targets, candidate, kinds).forEach((target) => {
              addReference(
                references,
                dependencies,
                sourceNode,
                getReferenceFieldName(sourceNode.element, [...path, key]),
                target,
                'structural',
              )
            })
          })
      }

      collectValue(
        rootNode,
        child,
        [...path, key],
        sourceNode,
        targets,
        visibleLoopTargets,
        propsScope,
        styleParameterTargetIds,
        styleLocalTargetIds,
        visibleTypeTargetIds,
        references,
        dependencies,
        visited,
      )
    })
  }

  const hasPotentialDependency = (
    value: unknown,
    path: readonly string[] = [],
    visited: Set<unknown> = new Set(),
  ): boolean => {
    if (value == null || typeof value === 'boolean' || typeof value === 'number') return false
    if (typeof value === 'string') {
      const key = path[path.length - 1] ?? ''
      if (dependencyFields.has(key)) return true
      const parsed = jsonFields.has(key) ? parseJson(value) : null
      return parsed != null && hasPotentialDependency(parsed, path, visited)
    }
    if (visited.has(value)) return false
    visited.add(value)

    if (Array.isArray(value)) {
      return value.some((item) => hasPotentialDependency(item, path, visited))
    }
    if (!isObject(value)) return false

    if (
      (value.type === 'formula' || value.type === 'script')
      && typeof value.source === 'string'
    ) return true

    return Object.entries(value).some(([key, child]) => (
      dependencyFields.has(key)
      || hasPotentialDependency(child, [...path, key], visited)
    ))
  }

  type Edges = {
    targets: readonly Target[]
    references: readonly Reference[]
    dependencies: readonly Dependency[]
  }

  const collectEdges = (
    rootNode: TreeNode.Node,
  ): Edges => {
    const propsScopes = createPropsScopes(rootNode)
    const styleParameterScopes = createStyleParameterScopes(rootNode)
    const styleLocalScopes = createStyleLocalScopes(rootNode)
    const targets = collectTargets(rootNode, rootNode, propsScopes)
    const references = new Map<string, Reference>()
    const dependencies = new Map<string, Dependency>()

    const walk = (
      node: TreeNode.Node,
      visibleLoopTargets: readonly Target[] = [],
    ) => {
      collectValue(
        rootNode,
        node.element,
        [],
        node,
        targets,
        visibleLoopTargets,
        propsScopes.sources.get(node.id) ?? null,
        styleParameterScopes.get(node.id) ?? new Set(),
        styleLocalScopes.get(node.id) ?? new Set(),
        new Set(TypeCatalog.collectVisibleNamedTypes(rootNode, node.id)
          .map((entry) => entry.node.id)),
        references,
        dependencies,
        new Set(),
      )

      const childLoopTargets = node.element.kind === 'loop'
        ? [
            ...visibleLoopTargets,
            ...targets.filter((target) => target.nodeId === node.id && target.isLoopAlias),
          ]
        : visibleLoopTargets
      node.children.forEach((child) => walk(child, childLoopTargets))
    }
    walk(rootNode)

    return {
      targets,
      references: [...references.values()],
      dependencies: [...dependencies.values()],
    }
  }

  export const collectDependencies = (
    rootNode: TreeNode.Node,
    sourceNodeIds: readonly number[],
  ): readonly Dependency[] => {
    const sourceNodeIdSet = new Set(sourceNodeIds)
    return collectEdges(rootNode).dependencies
      .filter((dependency) => sourceNodeIdSet.has(dependency.sourceNodeId))
      .sort((left, right) => left.sourceNodeId - right.sourceNodeId
        || left.targetNodeId - right.targetNodeId
        || left.targetLabel.localeCompare(right.targetLabel))
  }

  const selectFromEdges = (
    rootNode: TreeNode.Node,
    selectedNodeId: number,
    edges: Edges,
  ): Result => {
    const selectedNode = findNode(rootNode, selectedNodeId)
    if (selectedNode == null) {
      return {
        canHaveReferences: false,
        canHaveDependencies: false,
        references: [],
        dependencies: [],
      }
    }

    const selectedTarget = edges.targets.find((target) => target.nodeId === selectedNodeId)

    return {
      canHaveReferences: selectedTarget?.canBeReferenced === true,
      canHaveDependencies: hasPotentialDependency(selectedNode.element),
      references: edges.references
        .filter((reference) => (
          selectedTarget?.canBeReferenced === true
          && reference.targetNodeId === selectedNodeId
        ))
        .sort((left, right) => left.sourceNodeId - right.sourceNodeId || left.sourceLabel.localeCompare(right.sourceLabel)),
      dependencies: edges.dependencies
        .filter((dependency) => dependency.sourceNodeId === selectedNodeId)
        .filter((dependency) => !(
          selectedNode.element.kind === 'function'
          && dependency.sourceNodeId === dependency.targetNodeId
          && dependency.targetLabel.startsWith('function-parameter.')
        ))
        .sort((left, right) => left.targetNodeId - right.targetNodeId || left.targetLabel.localeCompare(right.targetLabel)),
    }
  }

  export const createSnapshot = (
    rootNode: TreeNode.Node,
  ): Snapshot => {
    const edges = collectEdges(rootNode)
    const results = new Map<number, Result>()

    return {
      select: (selectedNodeId) => {
        const cached = results.get(selectedNodeId)
        if (cached != null) return cached

        const result = selectFromEdges(rootNode, selectedNodeId, edges)
        results.set(selectedNodeId, result)
        return result
      },
    }
  }

  export const build = (
    rootNode: TreeNode.Node,
    selectedNodeId: number,
  ): Result => createSnapshot(rootNode).select(selectedNodeId)
}

export default ReferenceGraph
