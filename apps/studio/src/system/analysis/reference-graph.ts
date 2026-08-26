import TypeScript from 'typescript'
import type MebacoElement from '../element/element'
import type TreeNode from '../tree/tree-node'
import DefinitionCatalog from '../element/definition-catalog'

namespace ReferenceGraph {
  export type Reference = {
    sourceNodeId: number
    sourceLabel: string
    targetNodeId: number
    targetLabel: string
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

  type Target = {
    nodeId: number
    kind: string
    label: string
    nameAliases: ReadonlySet<string>
    definitionAliases: ReadonlySet<string>
    canBeReferenced: boolean
    isLoopAlias: boolean
  }

  type ReferenceKind =
    | 'app'
    | 'component'
    | 'function'
    | 'function-argument'
    | 'launch-argument'
    | 'object-type'
    | 'signature-type'
    | 'slot'
    | 'state'
    | 'style'
    | 'style-param'
    | 'union-type'
    | 'value-prop'
    | 'variable'

  const referenceKinds: Readonly<Record<string, readonly ReferenceKind[]>> = {
    appId: ['app'],
    componentId: ['component'],
    functionId: ['function'],
    propId: ['launch-argument', 'value-prop'],
    slotId: ['slot'],
    styleId: ['style'],
    parameterId: ['style-param'],
    namedTypeId: ['object-type', 'union-type', 'signature-type'],
    unionTypeId: ['union-type'],
    signatureTypeId: ['signature-type'],
    baseObjectId: ['object-type'],
    baseObjectIds: ['object-type'],
    objectTypeId: ['object-type'],
    objectTypeIds: ['object-type'],
  }

  const expressionRoots: Readonly<Record<string, readonly ReferenceKind[]>> = {
    $args: ['function-argument'],
    $function: ['function'],
    $launch: ['launch-argument'],
    $param: ['style-param'],
    $props: ['value-prop'],
    $state: ['state'],
    $var: ['variable'],
  }

  const jsonFields = new Set([
    'argumentBindings',
    'attributes',
    'condition',
    'definition',
    'initial',
    'propBindings',
    'properties',
    'refKey',
    'rules',
    'source',
    'styles',
    'valueType',
  ])

  const expressionFields = new Set([
    'collectionSource',
    'countSource',
    'condition',
    'initial',
    'source',
  ])

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

  const collectTargets = (
    node: TreeNode.Node,
    result: Target[] = [],
  ): Target[] => {
    const element = node.element
    const nameAliases = new Set<string>()
    const definitionAliases = new Set<string>()
    const id = getElementId(element)
    if (id != null) nameAliases.add(id)

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
      })
    }

    node.children.forEach((child) => collectTargets(child, result))
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
    if (element.kind === 'launcher' && key === 'argumentBindings') return 'argument'
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
  ) => `${sourceNodeId}:${sourceLabel}:${target.nodeId}`

  const addReference = (
    references: Map<string, Reference>,
    dependencies: Map<string, Dependency>,
    sourceNode: TreeNode.Node,
    sourceLabel: string,
    target: Target,
  ) => {
    const formattedSourceLabel = `${sourceNode.element.kind}#${sourceLabel}`
    const key = createEdgeKey(sourceNode.id, formattedSourceLabel, target)
    references.set(key, {
      sourceNodeId: sourceNode.id,
      sourceLabel: formattedSourceLabel,
      targetNodeId: target.nodeId,
      targetLabel: target.label,
    })
    dependencies.set(key, {
      sourceNodeId: sourceNode.id,
      targetNodeId: target.nodeId,
      targetLabel: target.label,
    })
  }

  const analyzeExpression = (
    source: string,
    sourceNode: TreeNode.Node,
    sourceLabel: string,
    targets: readonly Target[],
    visibleLoopTargets: readonly Target[],
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
      getCandidates(targets, property, expressionRoots[root], visibleLoopTargets, 'name')
        .forEach((target) => addReference(references, dependencies, sourceNode, sourceLabel, target))
    }

    const visit = (node: TypeScript.Node) => {
      if (TypeScript.isPropertyAccessExpression(node)) {
        if (TypeScript.isIdentifier(node.expression)) {
          resolveExpression(node.expression.text, node.name.text)
        }
      } else if (TypeScript.isElementAccessExpression(node)) {
        if (
          TypeScript.isIdentifier(node.expression)
          && node.argumentExpression != null
          && TypeScript.isStringLiteral(node.argumentExpression)
        ) {
          resolveExpression(node.expression.text, node.argumentExpression.text)
        }
      }

      TypeScript.forEachChild(node, visit)
    }

    visit(sourceFile)
  }

  const collectValue = (
    value: unknown,
    path: readonly string[],
    sourceNode: TreeNode.Node,
    targets: readonly Target[],
    visibleLoopTargets: readonly Target[],
    references: Map<string, Reference>,
    dependencies: Map<string, Dependency>,
    visited: Set<unknown>,
  ) => {
    if (value == null || typeof value === 'boolean' || typeof value === 'number') return
    if (typeof value === 'string') {
      const key = path[path.length - 1] ?? ''
      const parsed = jsonFields.has(key) ? parseJson(value) : null
      if (parsed != null) {
        collectValue(parsed, path, sourceNode, targets, visibleLoopTargets, references, dependencies, visited)
      } else if (expressionFields.has(key)) {
        analyzeExpression(
          value,
          sourceNode,
          getExpressionFieldName(sourceNode.element, path),
          targets,
          visibleLoopTargets,
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
        item,
        path,
        sourceNode,
        targets,
        visibleLoopTargets,
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
        value.source,
        sourceNode,
        getExpressionFieldName(sourceNode.element, path),
        targets,
        visibleLoopTargets,
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
              )
            })
          })
      }

      collectValue(
        child,
        [...path, key],
        sourceNode,
        targets,
        visibleLoopTargets,
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

  export const build = (
    rootNode: TreeNode.Node,
    selectedNodeId: number,
  ): Result => {
    const targets = collectTargets(rootNode)
    const references = new Map<string, Reference>()
    const dependencies = new Map<string, Dependency>()
    const selectedNode = findNode(rootNode, selectedNodeId)

    if (selectedNode == null) {
      return {
        canHaveReferences: false,
        canHaveDependencies: false,
        references: [],
        dependencies: [],
      }
    }

    const selectedTarget = targets.find((target) => target.nodeId === selectedNodeId)

    const walk = (
      node: TreeNode.Node,
      visibleLoopTargets: readonly Target[] = [],
    ) => {
      collectValue(
        node.element,
        [],
        node,
        targets,
        visibleLoopTargets,
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
      canHaveReferences: selectedTarget?.canBeReferenced === true,
      canHaveDependencies: hasPotentialDependency(selectedNode.element),
      references: [...references.values()]
        .filter((reference) => (
          selectedTarget?.canBeReferenced === true
          && reference.targetNodeId === selectedNodeId
        ))
        .sort((left, right) => left.sourceNodeId - right.sourceNodeId || left.sourceLabel.localeCompare(right.sourceLabel)),
      dependencies: [...dependencies.values()]
        .filter((dependency) => dependency.sourceNodeId === selectedNodeId)
        .sort((left, right) => left.targetNodeId - right.targetNodeId || left.targetLabel.localeCompare(right.targetLabel)),
    }
  }
}

export default ReferenceGraph
