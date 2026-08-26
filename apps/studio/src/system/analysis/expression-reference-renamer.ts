import TypeScript from 'typescript'
import type MebacoElement from '../element/element'
import ContentHost from '../element/content-host'
import DefinitionCatalog from '../element/definition-catalog'
import FunctionScope from '../element/kind/function/function-scope'
import StyleParameterCatalog from '../element/kind/view/style-parameter-catalog'
import type TreeNode from '../tree/tree-node'
import ReferenceGraph from './reference-graph'

namespace ExpressionReferenceRenamer {
  export type Result = {
    rootNode: TreeNode.Node
    changedNodeIds: readonly number[]
    occurrenceCount: number
  }

  export class AmbiguousReferenceError extends Error {
    constructor(
      readonly sourceNodeId: number,
      readonly expressionRoot: string,
      readonly referenceId: string,
    ) {
      super(`Expression reference '${expressionRoot}.${referenceId}' is ambiguous at node-${sourceNodeId}.`)
      this.name = 'AmbiguousReferenceError'
    }
  }

  const expressionKinds: Readonly<Record<string, readonly MebacoElement.Kind[]>> = {
    $args: ['function-argument'],
    $function: ['function'],
    $launch: ['launch-argument'],
    $param: ['style-param'],
    $props: ['value-prop'],
    $state: ['state'],
    $var: ['variable', 'loop'],
  }

  const expressionFields = new Set([
    'collectionSource',
    'countSource',
    'condition',
    'initial',
    'source',
  ])

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

  const isObject = (value: unknown): value is Record<string, unknown> => (
    value != null && typeof value === 'object' && !Array.isArray(value)
  )

  const findDirectChild = (
    node: TreeNode.Node | null | undefined,
    kind: MebacoElement.Kind,
  ): TreeNode.Node | null => node?.children.find((child) => child.element.kind === kind) ?? null

  const collectNodes = (
    node: TreeNode.Node,
    result: TreeNode.Node[] = [],
  ): TreeNode.Node[] => {
    result.push(node)
    node.children.forEach((child) => collectNodes(child, result))
    return result
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

  const cloneNode = (node: TreeNode.Node): TreeNode.Node => ({
    ...node,
    children: node.children.map(cloneNode),
  })

  const getStateNodes = (
    ownerNode: TreeNode.Node,
  ): TreeNode.Node[] => findDirectChild(findDirectChild(ownerNode, 'store'), 'states')
    ?.children.filter((child) => child.element.kind === 'state') ?? []

  const resolveState = (
    rootNode: TreeNode.Node,
    sourceNode: TreeNode.Node,
    id: string,
  ): TreeNode.Node | null => {
    const path = findPath(rootNode, sourceNode.id) ?? []
    const ownerApp = [...path].reverse().find((node) => node.element.kind === 'app')
    const ownerCommon = [...path].reverse().find((node) => node.element.kind === 'common')
    const visible = new Map<string, TreeNode.Node>()
    const add = (owner: TreeNode.Node | undefined) => {
      if (owner == null) return
      getStateNodes(owner).forEach((node) => {
        if (node.element.kind === 'state') visible.set(node.element.id, node)
      })
    }

    if (ownerApp == null) {
      add(ownerCommon)
      if (ownerCommon == null) {
        rootNode.children.forEach((node) => {
          if (node.element.kind === 'state') visible.set(node.element.id, node)
        })
      }
    }
    else {
      add(ownerApp)
      path.filter((node) => node.element.kind === 'component').forEach(add)
    }
    return visible.get(id) ?? null
  }

  const resolveVariable = (
    rootNode: TreeNode.Node,
    sourceNode: TreeNode.Node,
    id: string,
  ): TreeNode.Node | null => {
    const path = findPath(rootNode, sourceNode.id) ?? []
    const visible = new Map<string, TreeNode.Node>()
    const addVariable = (node: TreeNode.Node) => {
      if (node.element.kind === 'variable') visible.set(node.element.id, node)
    }

    path.forEach((node, index) => {
      if (node.element.kind === 'loop' && node.id !== sourceNode.id) {
        visible.set(node.element.indexId, node)
        if (node.element.mode === 'collection') visible.set(node.element.itemId, node)
      }

      const nextNode = path[index + 1]
      const retentionNode = ContentHost.getRetentionNode(node)
      const elementsNode = ContentHost.getElementsNode(node)
      if (retentionNode != null && nextNode === elementsNode) {
        retentionNode.children.forEach(addVariable)
      }
      if (
        (node.element.kind === 'retention' || node.element.kind === 'function-procedure')
        && nextNode != null
      ) {
        node.children.slice(0, node.children.indexOf(nextNode)).forEach(addVariable)
      }
    })
    return visible.get(id) ?? null
  }

  const resolveTargetNode = (
    rootNode: TreeNode.Node,
    sourceNode: TreeNode.Node,
    expressionRoot: string,
    id: string,
  ): TreeNode.Node | null => {
    const path = findPath(rootNode, sourceNode.id) ?? []
    switch (expressionRoot) {
      case '$state':
        return resolveState(rootNode, sourceNode, id)
      case '$var':
        return resolveVariable(rootNode, sourceNode, id)
      case '$function':
        return FunctionScope.resolveFunction(rootNode, sourceNode.id, id)?.node ?? null
      case '$args': {
        const owner = FunctionScope.findOwnerFunction(rootNode, sourceNode.id)
        return findDirectChild(owner?.node, 'function-arguments')
          ?.children.find((node) => node.element.kind === 'function-argument' && node.element.id === id) ?? null
      }
      case '$launch': {
        const owner = [...path].reverse().find((node) => node.element.kind === 'app')
        return findDirectChild(findDirectChild(owner, 'launch-options'), 'launch-arguments')
          ?.children.find((node) => node.element.kind === 'launch-argument' && node.element.id === id) ?? null
      }
      case '$props': {
        const owner = [...path].reverse().find((node) => node.element.kind === 'component')
        return findDirectChild(owner, 'props')
          ?.children.find((node) => node.element.kind === 'value-prop' && node.element.id === id) ?? null
      }
      case '$param': {
        const owner = [...path].reverse().find((node) => node.element.kind === 'style')
        if (owner?.element.kind !== 'style') return null
        const parameter = StyleParameterCatalog.createCatalog(rootNode)
          .resolve(owner.element.styleId).parameters.find((item) => item.id === id)
        if (parameter == null) return null
        return collectNodes(rootNode).find((node) => (
          node.element.kind === 'style-param'
          && DefinitionCatalog.getDefinitionId(node.element) === parameter.parameterId
        )) ?? null
      }
      default:
        return null
    }
  }

  const replaceExpression = (
    source: string,
    rootNode: TreeNode.Node,
    sourceNode: TreeNode.Node,
    targetNodeId: number,
    oldId: string,
    nextId: string,
  ): { source: string; count: number } => {
    if (source.trim().length === 0) return { source, count: 0 }
    const sourceFile = TypeScript.createSourceFile(
      'mebaco-reference-refactoring.ts',
      source,
      TypeScript.ScriptTarget.Latest,
      true,
      TypeScript.ScriptKind.TS,
    )
    const replacements: Array<{ start: number; end: number; text: string }> = []

    const addReference = (
      expressionRoot: string,
      referenceId: string,
      start: number,
      end: number,
      text: string,
    ) => {
      if (referenceId !== oldId || expressionKinds[expressionRoot] == null) return
      const resolved = resolveTargetNode(rootNode, sourceNode, expressionRoot, referenceId)
      if (resolved?.id !== targetNodeId) return
      replacements.push({ start, end, text })
    }

    const visit = (node: TypeScript.Node) => {
      if (TypeScript.isPropertyAccessExpression(node) && TypeScript.isIdentifier(node.expression)) {
        addReference(
          node.expression.text,
          node.name.text,
          node.name.getStart(sourceFile),
          node.name.end,
          nextId,
        )
      } else if (
        TypeScript.isElementAccessExpression(node)
        && TypeScript.isIdentifier(node.expression)
        && node.argumentExpression != null
        && TypeScript.isStringLiteral(node.argumentExpression)
      ) {
        const literal = node.argumentExpression
        const original = source.slice(literal.getStart(sourceFile), literal.end)
        const quote = original.startsWith("'") ? "'" : '"'
        addReference(
          node.expression.text,
          literal.text,
          literal.getStart(sourceFile),
          literal.end,
          `${quote}${nextId}${quote}`,
        )
      } else if (
        TypeScript.isCallExpression(node)
        && TypeScript.isPropertyAccessExpression(node.expression)
        && TypeScript.isIdentifier(node.expression.expression)
        && node.expression.expression.text === '$system'
        && node.expression.name.text === 'transition'
      ) {
        const argument = node.arguments[0]
        if (argument != null && TypeScript.isStringLiteral(argument) && argument.text === oldId) {
          const target = collectNodes(rootNode).filter((candidate) => (
            candidate.element.kind === 'app' && candidate.element.id === oldId
          ))
          if (target.some((candidate) => candidate.id === targetNodeId)) {
            if (target.length !== 1) throw new AmbiguousReferenceError(sourceNode.id, '$system.transition', oldId)
            const original = source.slice(argument.getStart(sourceFile), argument.end)
            const quote = original.startsWith("'") ? "'" : '"'
            replacements.push({
              start: argument.getStart(sourceFile),
              end: argument.end,
              text: `${quote}${nextId}${quote}`,
            })
          }
        }
      }
      TypeScript.forEachChild(node, visit)
    }
    visit(sourceFile)

    let nextSource = source
    replacements.sort((left, right) => right.start - left.start).forEach((replacement) => {
      nextSource = `${nextSource.slice(0, replacement.start)}${replacement.text}${nextSource.slice(replacement.end)}`
    })
    return { source: nextSource, count: replacements.length }
  }

  const rewriteValue = (
    value: unknown,
    key: string,
    rootNode: TreeNode.Node,
    sourceNode: TreeNode.Node,
    targetNodeId: number,
    oldId: string,
    nextId: string,
  ): { value: unknown; count: number } => {
    if (typeof value === 'string') {
      if (jsonFields.has(key)) {
        try {
          const parsed = JSON.parse(value)
          const rewritten = rewriteValue(parsed, key, rootNode, sourceNode, targetNodeId, oldId, nextId)
          if (rewritten.count > 0) return { value: JSON.stringify(rewritten.value), count: rewritten.count }
        } catch {
          // Plain expressions are intentionally handled below.
        }
      }
      if (!expressionFields.has(key)) return { value, count: 0 }
      const rewritten = replaceExpression(value, rootNode, sourceNode, targetNodeId, oldId, nextId)
      return { value: rewritten.source, count: rewritten.count }
    }
    if (Array.isArray(value)) {
      let count = 0
      const result = value.map((item) => {
        const rewritten = rewriteValue(item, key, rootNode, sourceNode, targetNodeId, oldId, nextId)
        count += rewritten.count
        return rewritten.value
      })
      return { value: count > 0 ? result : value, count }
    }
    if (!isObject(value)) return { value, count: 0 }

    let count = 0
    const result: Record<string, unknown> = { ...value }
    Object.entries(value).forEach(([childKey, child]) => {
      const rewritten = rewriteValue(child, childKey, rootNode, sourceNode, targetNodeId, oldId, nextId)
      if (rewritten.count > 0) result[childKey] = rewritten.value
      count += rewritten.count
    })
    return { value: count > 0 ? result : value, count }
  }

  export const rename = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    nextId: string,
  ): Result => {
    const targetNode = findNode(rootNode, targetNodeId)
    if (targetNode == null) throw new Error(`node-${targetNodeId} was not found.`)
    const oldId = 'id' in targetNode.element
      ? (targetNode.element as { id?: unknown }).id
      : null
    if (typeof oldId !== 'string') throw new Error(`node-${targetNodeId} does not define an Id.`)
    if (oldId === nextId) return { rootNode, changedNodeIds: [], occurrenceCount: 0 }

    const graph = ReferenceGraph.build(rootNode, targetNodeId)
    const sourceNodeIds = new Set(graph.references.map((reference) => reference.sourceNodeId))

    const nextRoot = cloneNode(rootNode)
    const changedNodeIds: number[] = []
    let occurrenceCount = 0
    collectNodes(nextRoot).forEach((node) => {
      if (!sourceNodeIds.has(node.id)) return
      const rewritten = rewriteValue(
        node.element,
        '',
        rootNode,
        node,
        targetNodeId,
        oldId,
        nextId,
      )
      if (rewritten.count === 0) return
      node.element = rewritten.value as MebacoElement.Element
      changedNodeIds.push(node.id)
      occurrenceCount += rewritten.count
    })

    const nextTarget = findNode(nextRoot, targetNodeId)
    if (nextTarget == null) throw new Error(`node-${targetNodeId} was not found.`)
    nextTarget.element = { ...nextTarget.element, id: nextId } as MebacoElement.Element
    return { rootNode: nextRoot, changedNodeIds, occurrenceCount }
  }
}

export default ExpressionReferenceRenamer
