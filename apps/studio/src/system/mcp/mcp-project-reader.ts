import TreeNode from '@system/model/tree/tree-node'
import ElementRegistry from '@system/workspace/element-definition/element-registry'
import ReferenceGraph from '@system/model/reference/reference-graph'
import { createMcpProjectSummary } from './mcp-project-summary'

type JsonObject = Record<string, unknown>

type ComponentRecord = {
  node: TreeNode.Node
  ownerScope: string
  local: boolean
}

type ReadContext = {
  rootNode: TreeNode.Node
  dirty: boolean
  revision: number
  sessionId: string | null
}

const MODEL_VERSION = '1'
const COMPONENT_LIST_LIMIT = 100
const DEFAULT_DEPTH = 3
const DEFAULT_NODES = 80
const MAX_DEPTH = 8
const MAX_NODES = 200
const DETAIL_SOURCE_LIMIT = 8000
const DETAIL_CHILD_LIMIT = 100
const ANALYSIS_NODE_LIMIT = 200
const ANALYSIS_EDGE_LIMIT = 300

const childOfKind = (
  node: TreeNode.Node,
  kind: string,
): TreeNode.Node | null => node.children.find((child) => child.element.kind === kind) ?? null

const stringProperty = (value: unknown, key: string): string | null => {
  if (value == null || typeof value !== 'object' || !(key in value)) return null
  const property = (value as Record<string, unknown>)[key]
  return typeof property === 'string' ? property : null
}

const nodeLabel = (node: TreeNode.Node): string => {
  const element = node.element as unknown as Record<string, unknown>
  for (const key of ['id', 'tagName', 'name', 'comment']) {
    const value = element[key]
    if (typeof value === 'string' && value.trim() !== '') return value.trim().slice(0, 120)
  }
  return node.element.kind
}

const stableElementIdentity = (node: TreeNode.Node): JsonObject => {
  const element = node.element as unknown as Record<string, unknown>
  const identity: JsonObject = {}
  for (const key of [
    'appId', 'componentId', 'styleId', 'slotId', 'propId', 'stateId', 'parameterId', 'bundleId',
  ]) {
    if (typeof element[key] === 'string') identity[key] = element[key]
  }
  return identity
}

const detailFields: Record<string, readonly string[]> = {
  app: ['id', 'appId'], entry: ['componentId', 'propBindings'], component: ['id', 'componentId', 'local'],
  'value-prop': ['id', 'propId', 'valueType', 'nullable', 'defaultValue'], slot: ['id', 'slotId'],
  'slot-content': ['slotId'], 'component-use': ['componentId', 'propBindings'],
  state: ['id', 'valueType', 'nullable', 'initial'],
  variable: ['id', 'binding', 'typeSetting', 'source'], constant: ['id', 'typeSetting', 'source'],
  function: ['id', 'signature', 'implementation'], action: ['comment', 'source'],
  effect: ['comment', 'dependencies', 'action'], transition: ['appId', 'argumentBindings'],
  style: ['id', 'styleId', 'category', 'rules', 'animations', 'bases'],
  'style-param': ['id', 'parameterId', 'valueType', 'defaultValue'],
  tag: ['tagName', 'comment', 'styles', 'attributes', 'refKey', 'partialKey'],
  text: ['source'], loop: ['mode', 'countSource', 'collectionSource', 'itemId', 'indexId'],
  if: ['condition'], 'else-if': ['condition'], conditional: ['condition'],
  'object-type': ['id', 'typeId', 'properties'], 'union-type': ['id', 'typeId', 'variants'],
  'signature-type': ['id', 'typeId', 'parameters', 'returnType'],
}

const sourceFields = new Set([
  'source', 'formula', 'initial', 'initialValue', 'defaultValue', 'value', 'condition', 'countSource',
  'collectionSource', 'attributes', 'styles', 'refKey', 'partialKey', 'propBindings',
  'extends', 'typeDefault', 'parameters', 'properties', 'variants', 'signature', 'returnType',
  'implementation', 'rules', 'animations', 'bases', 'dependencies', 'action', 'argumentBindings',
])

const boundedValue = (
  value: unknown,
  includeSource: boolean,
  truncatedFields: string[],
  field: string,
  depth = 0,
): unknown => {
  if (value == null || typeof value === 'boolean' || typeof value === 'number') return value
  if (typeof value === 'string') {
    if (!includeSource || !sourceFields.has(field) || value.length <= DETAIL_SOURCE_LIMIT) return value
    truncatedFields.push(field)
    return value.slice(0, DETAIL_SOURCE_LIMIT)
  }
  if (depth >= 8) return '[nested value omitted]'
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => boundedValue(item, includeSource, truncatedFields, field, depth + 1))
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => !/(token|secret|password|path|binary|credential)/i.test(key))
      .slice(0, 100)
      .map(([key, child]) => [key, boundedValue(child, includeSource, truncatedFields, key, depth + 1)]))
  }
  return null
}

const getMcpNodeLabel = (node: TreeNode.Node): string => {
  const element = node.element as unknown as Record<string, unknown>
  for (const key of ['id', 'tagName', 'name', 'comment']) {
    const value = element[key]
    if (typeof value === 'string' && value.trim() !== '') return value.trim().slice(0, 120)
  }
  return node.element.kind
}

export const getMcpNodeDetails = (
  context: ReadContext,
  nodeId: number,
  includeSource = false,
): JsonObject => {
  const path = TreeNode.findPath(context.rootNode, nodeId)
  const node = path?.at(-1)
  if (path == null || node == null) return { error: { code: 'NODE_NOT_FOUND', message: 'No node matches the supplied nodeId.' } }
  const keys = detailFields[node.element.kind]
  const element = node.element as unknown as Record<string, unknown>
  const truncatedFields: string[] = []
  const fields = Object.fromEntries((keys ?? [])
    .filter((key) => key in element && (includeSource || !sourceFields.has(key)))
    .map((key) => [key, boundedValue(element[key], includeSource, truncatedFields, key)]))
  return {
    sessionId: context.sessionId,
    modelVersion: MODEL_VERSION,
    dirty: context.dirty,
    revision: context.revision,
    node: {
      nodeId,
      kind: node.element.kind,
      label: getMcpNodeLabel(node),
      identity: stableElementIdentity(node),
      ancestorPath: path.slice(0, -1).map((ancestor) => ({ nodeId: ancestor.id, kind: ancestor.element.kind, label: getMcpNodeLabel(ancestor) })),
      fields,
      detailsSupported: keys != null,
      children: node.children.slice(0, DETAIL_CHILD_LIMIT).map((child) => ({ nodeId: child.id, kind: child.element.kind, label: getMcpNodeLabel(child), childCount: child.children.length })),
      childCount: node.children.length,
      childrenTruncated: node.children.length > DETAIL_CHILD_LIMIT,
      truncatedFields: [...new Set(truncatedFields)],
    },
    snapshotConsistency: 'live-per-call; project may change between calls',
  }
}

export const getMcpNodeReferences = (
  context: ReadContext,
  nodeId: number,
  direction: 'incoming' | 'outgoing' | 'both' = 'both',
  limit = 50,
): JsonObject => {
  const selected = TreeNode.findNode(context.rootNode, nodeId)
  if (selected == null) return { error: { code: 'NODE_NOT_FOUND', message: 'No node matches the supplied nodeId.' } }
  const graphSnapshot = ReferenceGraph.createSnapshot(context.rootNode)
  const graph = graphSnapshot.select(nodeId)
  const semanticDependencies = graphSnapshot.semanticDependencies()
  const references = graph.references.map((edge) => ({
    nodeId: edge.sourceNodeId,
    kind: TreeNode.findNode(context.rootNode, edge.sourceNodeId)?.element.kind ?? null,
    label: edge.sourceLabel,
    targetLabel: edge.targetLabel,
    sourceType: edge.sourceType,
  }))
  const supportedDependencies = new Set(graph.dependencies.map((edge) => `${edge.targetNodeId}:${edge.targetLabel}`))
  const dependencies = [...new Map(semanticDependencies
    .filter((edge) => edge.sourceNodeId === nodeId && supportedDependencies.has(`${edge.targetNodeId}:${edge.targetLabel}`))
    .map((edge) => [`${edge.targetNodeId}:${edge.targetLabel}:${edge.sourceType}`, {
      nodeId: edge.targetNodeId,
      kind: TreeNode.findNode(context.rootNode, edge.targetNodeId)?.element.kind ?? null,
      label: edge.targetLabel,
      sourceLabel: edge.sourceLabel,
      sourceType: edge.sourceType,
    }]))
    .values()]
  const includeIncoming = direction !== 'outgoing'
  const includeOutgoing = direction !== 'incoming'
  return {
    sessionId: context.sessionId,
    modelVersion: MODEL_VERSION,
    dirty: context.dirty,
    revision: context.revision,
    nodeId,
    canHaveReferences: graph.canHaveReferences,
    canHaveDependencies: graph.canHaveDependencies,
    incoming: { included: includeIncoming, totalCount: references.length, items: includeIncoming ? references.slice(0, limit) : [], truncated: includeIncoming && references.length > limit },
    outgoing: { included: includeOutgoing, totalCount: dependencies.length, items: includeOutgoing ? dependencies.slice(0, limit) : [], truncated: includeOutgoing && dependencies.length > limit },
    coverage: 'ReferenceGraph-supported semantic and structural relationships only; not an exhaustive scan of all textual mentions.',
    snapshotConsistency: 'live-per-call; project may change between calls',
  }
}

const collectComponentRecords = (rootNode: TreeNode.Node): ComponentRecord[] => {
  const records: ComponentRecord[] = []
  const visit = (node: TreeNode.Node, ownerScope: string, parentKind: string | null) => {
    const nextOwnerScope = node.element.kind === 'app'
      ? `app:${stringProperty(node.element, 'appId') ?? node.id}`
      : node.element.kind === 'common'
        ? 'common'
        : node.element.kind === 'component'
          ? `component:${stringProperty(node.element, 'componentId') ?? node.id}`
          : node.element.kind === 'retention'
            ? `retention:${node.id}`
        : ownerScope
    const local = node.element.kind === 'component'
      && (node.element as unknown as { local?: boolean }).local === true
    if (node.element.kind === 'component' && (local || parentKind === 'components')) {
      records.push({ node, ownerScope, local })
    }
    node.children.forEach((child) => visit(child, nextOwnerScope, node.element.kind))
  }
  visit(rootNode, 'project', null)
  return records
}

const findAppNodes = (rootNode: TreeNode.Node): TreeNode.Node[] => {
  const appsNode = childOfKind(rootNode, 'apps')
  return appsNode?.children.filter((child) => child.element.kind === 'app') ?? []
}

const componentsVisibleToApp = (
  records: readonly ComponentRecord[],
  appNode: TreeNode.Node,
): ComponentRecord[] => {
  const appId = stringProperty(appNode.element, 'appId')
  const owner = `app:${appId ?? appNode.id}`
  return records.filter((record) => (
    !record.local && (record.ownerScope === 'common' || record.ownerScope === owner)
  ))
}

const findEntry = (appNode: TreeNode.Node): TreeNode.Node | null => childOfKind(appNode, 'entry')

const resolveComponent = (
  records: readonly ComponentRecord[],
  componentId: string | null,
): { status: 'unset' | 'unresolved' | 'ambiguous' | 'resolved'; record: ComponentRecord | null } => {
  if (componentId == null || componentId === '') return { status: 'unset', record: null }
  const matches = records.filter((record) => stringProperty(record.node.element, 'componentId') === componentId)
  if (matches.length === 0) return { status: 'unresolved', record: null }
  if (matches.length > 1) return { status: 'ambiguous', record: null }
  return { status: 'resolved', record: matches[0] }
}

const appEntrySummary = (
  appNode: TreeNode.Node,
  allComponents: readonly ComponentRecord[],
) => {
  const entryNode = findEntry(appNode)
  const entryElement = entryNode?.element.kind === 'entry' ? entryNode.element : null
  const visibleComponents = componentsVisibleToApp(allComponents, appNode)
  const resolved = resolveComponent(visibleComponents, entryElement?.componentId ?? null)
  return {
    nodeId: entryNode?.id ?? null,
    componentId: entryElement?.componentId ?? null,
    componentName: resolved.record?.node.element.kind === 'component'
      ? resolved.record.node.element.id
      : null,
    status: entryNode == null ? 'entry-missing' : resolved.status,
    propBindingCount: entryElement?.propBindings.length ?? 0,
  }
}

const createComponentList = (
  records: readonly ComponentRecord[],
  limit: number,
) => ({
  count: records.length,
  items: records.slice(0, limit).map(({ node, ownerScope, local }) => ({
    nodeId: node.id,
    componentId: stringProperty(node.element, 'componentId'),
    name: nodeLabel(node),
    scope: ownerScope,
    local,
  })),
  truncated: records.length > limit,
})

export const getMcpProjectOverview = (context: ReadContext): JsonObject => {
  const { rootNode, dirty, revision, sessionId } = context
  const allComponents = collectComponentRecords(rootNode)
  const appNodes = findAppNodes(rootNode)
  const overview = createMcpProjectSummary(
    rootNode,
    -1,
    dirty,
    revision,
  )
  return {
    sessionId,
    modelVersion: MODEL_VERSION,
    dirty,
    revision,
    project: {
      projectId: stringProperty(rootNode.element, 'projectId'),
      rootKind: rootNode.element.kind,
    },
    summary: {
      nodeCount: overview.nodeCount,
      kindCounts: overview.kindCounts,
    },
    apps: appNodes.map((node) => ({
      nodeId: node.id,
      appId: stringProperty(node.element, 'appId'),
      name: nodeLabel(node),
      entry: appEntrySummary(node, allComponents),
    })),
    components: createComponentList(
      allComponents.filter((record) => !record.local),
      COMPONENT_LIST_LIMIT,
    ),
  }
}

const getAppNodeById = (rootNode: TreeNode.Node, appId: string): TreeNode.Node | null => (
  findAppNodes(rootNode).find((node) => stringProperty(node.element, 'appId') === appId) ?? null
)

const summarizePropBindings = (
  bindings: readonly { propId: string; source: { type: string; value?: unknown; source?: unknown } }[],
) => bindings.map((binding) => ({
  propId: binding.propId,
  sourceType: binding.source.type,
  ...(binding.source.type === 'literal' ? { literalValue: binding.source.value } : {}),
}))

export const getMcpAppContext = (
  context: ReadContext,
  appId: string,
): JsonObject => {
  const { rootNode, dirty, revision, sessionId } = context
  const appNode = getAppNodeById(rootNode, appId)
  if (appNode == null) {
    return { error: { code: 'APP_NOT_FOUND', message: 'No app matches the supplied appId.' } }
  }
  const records = collectComponentRecords(rootNode)
  const visibleRecords = componentsVisibleToApp(records, appNode)
  const entryNode = findEntry(appNode)
  const entryElement = entryNode?.element.kind === 'entry' ? entryNode.element : null
  const resolved = resolveComponent(visibleRecords, entryElement?.componentId ?? null)
  const declaresNode = childOfKind(appNode, 'declares')
  const propBindings = entryElement == null
    ? []
    : summarizePropBindings(entryElement.propBindings)
  return {
    sessionId,
    modelVersion: MODEL_VERSION,
    dirty,
    revision,
    app: {
      nodeId: appNode.id,
      appId: stringProperty(appNode.element, 'appId'),
      name: nodeLabel(appNode),
    },
    entry: {
      nodeId: entryNode?.id ?? null,
      componentId: entryElement?.componentId ?? null,
      status: entryNode == null ? 'entry-missing' : resolved.status,
      component: resolved.record == null ? null : {
        nodeId: resolved.record.node.id,
        componentId: stringProperty(resolved.record.node.element, 'componentId'),
        name: nodeLabel(resolved.record.node),
        local: resolved.record.local,
      },
      propBindings,
    },
    visibleComponents: createComponentList(visibleRecords, COMPONENT_LIST_LIMIT),
    sections: appNode.children.map((node) => ({
      nodeId: node.id,
      kind: node.element.kind,
      label: nodeLabel(node),
      childCount: node.children.length,
    })),
    declarationSections: (declaresNode?.children ?? [])
      .filter((node) => node.element.kind !== 'components')
      .map((node) => ({ nodeId: node.id, kind: node.element.kind, label: nodeLabel(node), childCount: node.children.length })),
  }
}

const analysisKinds = new Set([
  'component', 'component-use', 'value-prop', 'slot', 'state', 'variable', 'constant',
  'function', 'action', 'effect', 'transition', 'style', 'style-param', 'tag', 'text',
  'loop', 'if', 'else-if', 'switch', 'case', 'conditional', 'control-conditional',
  'control-switch', 'object-type', 'union-type', 'signature-type',
])

const collectAnalysisNodes = (
  roots: readonly TreeNode.Node[],
  limit: number,
): { nodes: TreeNode.Node[]; parentIds: Map<number, number | null>; totalCount: number } => {
  const nodes: TreeNode.Node[] = []
  const parentIds = new Map<number, number | null>()
  const visited = new Set<number>()
  let totalCount = 0
  const visit = (node: TreeNode.Node, parentId: number | null) => {
    if (visited.has(node.id)) return
    visited.add(node.id)
    if (analysisKinds.has(node.element.kind)) {
      totalCount += 1
      if (nodes.length < limit) {
        nodes.push(node)
        parentIds.set(node.id, parentId)
      }
    }
    const semanticParentId = analysisKinds.has(node.element.kind) ? node.id : parentId
    node.children.forEach((child) => visit(child, semanticParentId))
  }
  roots.forEach((root) => visit(root, null))
  return { nodes, parentIds, totalCount }
}

const analysisFields = (node: TreeNode.Node): JsonObject => {
  const keys = detailFields[node.element.kind] ?? []
  const element = node.element as unknown as Record<string, unknown>
  const truncatedFields: string[] = []
  const compact = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(compact)
    if (value == null || typeof value !== 'object') return value
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .filter(([key]) => ![
        'referenceId', 'parameterId', 'propertyId', 'dependencyId', 'styleId',
        'componentId', 'appId', 'typeId',
      ].includes(key))
      .map(([key, child]) => [key, compact(child)]))
  }
  const fields = Object.fromEntries(keys
    .filter((key) => key in element)
    .filter((key) => !['componentId', 'styleId', 'parameterId', 'typeId', 'appId'].includes(key))
    .map((key) => [key, compact(boundedValue(element[key], true, truncatedFields, key))]))
  if (truncatedFields.length > 0) fields.truncatedFields = [...new Set(truncatedFields)]
  return fields
}

export const getMcpAppAnalysisContext = (
  context: ReadContext,
  appId: string,
  maxNodes = ANALYSIS_NODE_LIMIT,
): JsonObject => {
  const appNode = getAppNodeById(context.rootNode, appId)
  if (appNode == null) return { error: { code: 'APP_NOT_FOUND', message: 'No app matches the supplied appId.' } }
  const records = collectComponentRecords(context.rootNode)
  const entryNode = findEntry(appNode)
  const entryElement = entryNode?.element.kind === 'entry' ? entryNode.element : null
  const resolved = resolveComponent(componentsVisibleToApp(records, appNode), entryElement?.componentId ?? null)
  const appStore = childOfKind(appNode, 'store')
  const appDeclares = childOfKind(appNode, 'declares')
  const roots = [resolved.record?.node, appStore, appDeclares]
    .filter((node): node is TreeNode.Node => node != null)
  const snapshot = ReferenceGraph.createSnapshot(context.rootNode)
  const allDependencies = snapshot.semanticDependencies()
  const inventory = collectAnalysisNodes(roots, maxNodes)
  const expandedNodes = [...inventory.nodes]
  const relevantIds = new Set(inventory.nodes.map((node) => node.id))
  const queue = [...relevantIds]
  while (queue.length > 0) {
    const sourceNodeId = queue.shift()!
    allDependencies
      .filter((edge) => edge.sourceNodeId === sourceNodeId)
      .forEach((edge) => {
        if (relevantIds.has(edge.targetNodeId)) return
        const target = TreeNode.findNode(context.rootNode, edge.targetNodeId)
        if (target == null || !analysisKinds.has(target.element.kind)) return
        relevantIds.add(target.id)
        queue.push(target.id)
        if (expandedNodes.length < maxNodes) expandedNodes.push(target)
      })
  }
  const includedIds = new Set(expandedNodes.map((node) => node.id))
  const dependencies = allDependencies.filter((edge) => includedIds.has(edge.sourceNodeId))
  const edgeItems = dependencies.slice(0, ANALYSIS_EDGE_LIMIT).map((edge) => ({
    from: edge.sourceNodeId,
    via: edge.sourceLabel,
    to: edge.targetNodeId,
    target: edge.targetLabel,
    type: edge.sourceType,
  }))
  return {
    sessionId: context.sessionId,
    modelVersion: MODEL_VERSION,
    dirty: context.dirty,
    revision: context.revision,
    app: { nodeId: appNode.id, appId, name: nodeLabel(appNode) },
    entry: {
      nodeId: entryNode?.id ?? null,
      componentId: entryElement?.componentId ?? null,
      status: entryNode == null ? 'entry-missing' : resolved.status,
      componentNodeId: resolved.record?.node.id ?? null,
      componentName: resolved.record == null ? null : nodeLabel(resolved.record.node),
      propBindings: entryElement == null ? [] : summarizePropBindings(entryElement.propBindings),
    },
    semanticNodes: {
      totalCount: Math.max(inventory.totalCount, relevantIds.size),
      returnedCount: expandedNodes.length,
      truncated: relevantIds.size > expandedNodes.length || inventory.totalCount > inventory.nodes.length,
      items: expandedNodes.map((node) => ({
        nodeId: node.id,
        parentNodeId: inventory.parentIds.get(node.id) ?? null,
        kind: node.element.kind,
        label: nodeLabel(node),
        fields: analysisFields(node),
      })),
    },
    dependencies: {
      totalCount: dependencies.length,
      returnedCount: edgeItems.length,
      truncated: dependencies.length > edgeItems.length,
      items: edgeItems,
      coverage: 'ReferenceGraph-supported semantic and structural relationships only.',
    },
    snapshotConsistency: 'one live TreeStore read for this call; project may change between calls',
  }
}

type StructureBudget = {
  remaining: number
  maxDepth: number
  truncated: boolean
  omittedNodeCount: number
}

const countSubtree = (node: TreeNode.Node): number => (
  1 + node.children.reduce((count, child) => count + countSubtree(child), 0)
)

const isContentHost = (node: TreeNode.Node): boolean => (
  ElementRegistry.get(node.element.kind).contentHost != null
)

const getContentBranches = (node: TreeNode.Node) => {
  const retentionNodes = node.children.filter((child) => child.element.kind === 'retention')
  const elementsNodes = node.children.filter((child) => child.element.kind === 'elements')
  if (retentionNodes.length === 0 && elementsNodes.length === 0) return { mode: 'direct' as const }
  if (retentionNodes.length === 1 && elementsNodes.length === 1) {
    return { mode: 'retention-elements' as const, retention: retentionNodes[0], elements: elementsNodes[0] }
  }
  return { mode: 'invalid-structured-content' as const, retentionNodes, elementsNodes }
}

const serializeNode = (
  node: TreeNode.Node,
  depth: number,
  budget: StructureBudget,
): JsonObject | null => {
  if (budget.remaining <= 0) {
    budget.truncated = true
    budget.omittedNodeCount += countSubtree(node)
    return null
  }
  budget.remaining -= 1
  const result: JsonObject = {
    nodeId: node.id,
    kind: node.element.kind,
    label: nodeLabel(node),
    childCount: node.children.length,
    identity: stableElementIdentity(node),
  }
  if (depth >= budget.maxDepth || node.children.length === 0) {
    if (node.children.length > 0 && depth >= budget.maxDepth) {
      budget.truncated = true
      budget.omittedNodeCount += node.children.reduce((count, child) => count + countSubtree(child), 0)
      result.omittedChildCount = node.children.length
      result.omittedChildNodeIds = node.children.slice(0, 100).map((child) => child.id)
      if (isContentHost(node)) {
        const branches = getContentBranches(node)
        result.contentMode = branches.mode
        if (branches.mode === 'invalid-structured-content') {
          result.structureIssue = {
            retentionNodeIds: branches.retentionNodes.map((child) => child.id),
            elementsNodeIds: branches.elementsNodes.map((child) => child.id),
          }
        }
      }
    }
    return result
  }

  if (isContentHost(node)) {
    const branches = getContentBranches(node)
    result.contentMode = branches.mode
    if (branches.mode === 'retention-elements') {
      result.retention = serializeNode(branches.retention, depth + 1, budget)
      const elementChildren: JsonObject[] = []
      for (const child of branches.elements.children) {
        const serialized = serializeNode(child, depth + 2, budget)
        if (serialized != null) elementChildren.push(serialized)
      }
      result.elements = {
        nodeId: branches.elements.id,
        kind: 'elements',
        childCount: branches.elements.children.length,
        omittedChildNodeIds: branches.elements.children
          .filter((child) => !elementChildren.some((entry) => entry.nodeId === child.id))
          .slice(0, 100)
          .map((child) => child.id),
        children: elementChildren,
      }
      return result
    }
    if (branches.mode === 'invalid-structured-content') {
      result.structureIssue = {
        retentionNodeIds: branches.retentionNodes.map((child) => child.id),
        elementsNodeIds: branches.elementsNodes.map((child) => child.id),
      }
      result.retentionBranches = branches.retentionNodes
        .map((child) => serializeNode(child, depth + 1, budget))
        .filter((child): child is JsonObject => child != null)
      result.elementsBranches = branches.elementsNodes.map((elementsNode) => ({
        nodeId: elementsNode.id,
        children: elementsNode.children
          .map((child) => serializeNode(child, depth + 2, budget))
          .filter((child): child is JsonObject => child != null),
      }))
      const structuralIds = new Set([
        ...branches.retentionNodes.map((child) => child.id),
        ...branches.elementsNodes.map((child) => child.id),
      ])
      result.children = node.children
        .filter((child) => !structuralIds.has(child.id))
        .map((child) => serializeNode(child, depth + 1, budget))
        .filter((child): child is JsonObject => child != null)
      return result
    }
  }

  const children: JsonObject[] = []
  for (const child of node.children) {
    const serialized = serializeNode(child, depth + 1, budget)
    if (serialized != null) children.push(serialized)
  }
  result.children = children
  return result
}

const summarizeProps = (componentNode: TreeNode.Node) => {
  const propsNode = childOfKind(componentNode, 'props')
  return (propsNode?.children ?? [])
    .filter((node) => node.element.kind === 'value-prop')
    .map((node) => {
      const element = node.element as unknown as Record<string, unknown>
      return {
        nodeId: node.id,
        propId: element.propId ?? null,
        name: element.id ?? nodeLabel(node),
        valueType: element.valueType ?? null,
        nullable: element.nullable === true,
        hasDefault: element.defaultValue != null,
      }
    })
}

const summarizeSlots = (componentNode: TreeNode.Node) => {
  const slotsNode = childOfKind(componentNode, 'slots')
  return (slotsNode?.children ?? [])
    .filter((node) => node.element.kind === 'slot')
    .map((node) => ({
      nodeId: node.id,
      slotId: stringProperty(node.element, 'slotId'),
      name: nodeLabel(node),
    }))
}

export const getMcpComponentStructure = (
  context: ReadContext,
  componentId: string,
  options: { maxDepth?: number; maxNodes?: number } = {},
): JsonObject => {
  const records = collectComponentRecords(context.rootNode)
  const matches = records.filter((record) => stringProperty(record.node.element, 'componentId') === componentId)
  if (matches.length === 0) {
    return { error: { code: 'COMPONENT_NOT_FOUND', message: 'No visible component matches the supplied componentId.' } }
  }
  if (matches.length > 1) {
    return { error: { code: 'AMBIGUOUS_REFERENCE', message: 'More than one component matches the supplied componentId.' } }
  }
  const { node: componentNode, ownerScope } = matches[0]
  const branches = getContentBranches(componentNode)
  const maxDepth = Math.min(MAX_DEPTH, Math.max(1, Math.trunc(options.maxDepth ?? DEFAULT_DEPTH)))
  const maxNodes = Math.min(MAX_NODES, Math.max(1, Math.trunc(options.maxNodes ?? DEFAULT_NODES)))
  const budget: StructureBudget = { remaining: maxNodes, maxDepth, truncated: false, omittedNodeCount: 0 }
  const retentionNode = branches.mode === 'retention-elements' ? branches.retention : null
  const elementsNode = branches.mode === 'retention-elements' ? branches.elements : null
  const retention = retentionNode == null ? null : serializeNode(retentionNode, 1, budget)
  const storeNode = childOfKind(componentNode, 'store')
  const store = storeNode == null ? null : serializeNode(storeNode, 1, budget)
  const elements: JsonObject[] = []
  for (const child of elementsNode?.children ?? []) {
    const serialized = serializeNode(child, 2, budget)
    if (serialized != null) elements.push(serialized)
  }
  return {
    sessionId: context.sessionId,
    modelVersion: MODEL_VERSION,
    dirty: context.dirty,
    revision: context.revision,
    component: {
      nodeId: componentNode.id,
      componentId,
      name: nodeLabel(componentNode),
      ownerScope,
      local: matches[0].local,
    },
    contentMode: branches.mode,
    props: summarizeProps(componentNode),
    slots: summarizeSlots(componentNode),
    store: storeNode == null ? null : {
      nodeId: storeNode.id,
      kind: 'store',
      childCount: storeNode.children.length,
      tree: store,
    },
    retention: retentionNode == null ? null : {
      nodeId: retentionNode.id,
      kind: 'retention',
      childCount: retentionNode.children.length,
      tree: retention,
    },
    elements: elementsNode == null ? null : {
      nodeId: elementsNode.id,
      kind: 'elements',
      childCount: elementsNode.children.length,
      children: elements,
    },
    structureIssue: branches.mode === 'invalid-structured-content'
      ? {
          retentionNodeIds: branches.retentionNodes.map((child) => child.id),
          elementsNodeIds: branches.elementsNodes.map((child) => child.id),
          retentionBranches: branches.retentionNodes
            .map((node) => serializeNode(node, 1, budget))
            .filter((node): node is JsonObject => node != null),
          elementsBranches: branches.elementsNodes
            .map((node) => ({
              nodeId: node.id,
              children: node.children
                .map((child) => serializeNode(child, 2, budget))
                .filter((child): child is JsonObject => child != null),
            })),
        }
      : undefined,
    truncated: budget.truncated,
    omittedNodeCount: budget.omittedNodeCount,
    snapshotConsistency: 'live-per-call; project may change between calls',
  }
}

export default {
  getProjectOverview: getMcpProjectOverview,
  getAppContext: getMcpAppContext,
  getAppAnalysisContext: getMcpAppAnalysisContext,
  getComponentStructure: getMcpComponentStructure,
  getNodeDetails: getMcpNodeDetails,
  getNodeReferences: getMcpNodeReferences,
}
