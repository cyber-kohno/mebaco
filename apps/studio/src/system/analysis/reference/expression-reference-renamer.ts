import TypeScript from 'typescript'
import type MebacoElement from '../../element/element'
import DefinitionCatalog from '../../element/definition-catalog'
import FunctionScope from '../../element/kind/function/function-scope'
import StyleParameterCatalog from '../../element/kind/view/style/style-parameter-catalog'
import type TreeNode from '../../tree/tree-node'
import ReferenceGraph from './reference-graph'
import AppId from '../../element/kind/app/app-id'
import TransitionExpression from './transition-expression'
import ReferenceLanguage from './reference-language'
import ElementExpressionFields from './element-expression-fields'
import ExpressionReferenceSyntax from './expression-reference-syntax'
import ScopedVariableResolver from './scoped-variable-resolver'
import TypeCatalog from '../../element/kind/type/type-catalog'
import StyleLocalScope from '../../element/kind/view/style/style-local-scope'

namespace ExpressionReferenceRenamer {
  export type Result = {
    rootNode: TreeNode.Node
    targetElement: MebacoElement.Element
    changedNodeIds: readonly number[]
    occurrenceCount: number
  }

  export class ReferenceCaptureError extends Error {
    constructor(
      readonly sourceNodeId: number,
      readonly expressionRoot: string,
      readonly referenceId: string,
    ) {
      super(`Renaming to '${referenceId}' would change the reference target of '${expressionRoot}.${referenceId}' at node-${sourceNodeId}.`)
      this.name = 'ReferenceCaptureError'
    }
  }

  const expressionFields = ElementExpressionFields.direct
  const jsonFields = ElementExpressionFields.referenceJson

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
        return ScopedVariableResolver.resolve(rootNode, sourceNode.id, id)?.node ?? null
      case '$local':
        return StyleLocalScope.resolve(rootNode, sourceNode.id, id)?.node ?? null
      case '$fn':
        return FunctionScope.resolveFunction(rootNode, sourceNode.id, id)?.node ?? null
      case '$args':
        return null
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
      case TypeCatalog.typeScriptNamespace:
        return TypeCatalog.collectVisibleNamedTypes(rootNode, sourceNode.id)
          .find((entry) => entry.element.id === id)?.node ?? null
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
    const targetNode = findNode(rootNode, targetNodeId)
    const transitionRename = targetNode?.element.kind === 'app'
      ? {
          oldAccessor: AppId.toTransitionAccessor(oldId),
          nextAccessor: AppId.toTransitionAccessor(nextId),
        }
      : null
    const transitionArgumentRename = targetNode?.element.kind === 'launch-argument'
      ? (() => {
          const ownerApp = [...(findPath(rootNode, targetNodeId) ?? [])]
            .reverse()
            .find((node) => node.element.kind === 'app')
          return ownerApp?.element.kind === 'app'
            ? { accessor: AppId.toTransitionAccessor(ownerApp.element.id) }
            : null
        })()
      : null

    const addReference = (
      expressionRoot: string,
      referenceId: string,
      start: number,
      end: number,
      text: string,
    ) => {
      if (referenceId !== oldId || !ReferenceLanguage.isExpressionRoot(expressionRoot)) return
      const resolved = resolveTargetNode(rootNode, sourceNode, expressionRoot, referenceId)
      if (resolved?.id !== targetNodeId) return
      const captured = resolveTargetNode(rootNode, sourceNode, expressionRoot, nextId)
      if (captured != null && captured.id !== targetNodeId) {
        throw new ReferenceCaptureError(sourceNode.id, expressionRoot, nextId)
      }
      replacements.push({ start, end, text })
    }

    const addTransitionReference = (
      referenceAccessor: string,
      start: number,
      end: number,
      text: string,
    ) => {
      if (
        transitionRename == null
        || referenceAccessor !== transitionRename.oldAccessor
      ) return
      const captured = collectNodes(rootNode).find((candidate) => (
        candidate.id !== targetNodeId
        && candidate.element.kind === 'app'
        && AppId.toTransitionAccessor(candidate.element.id) === transitionRename.nextAccessor
      ))
      if (captured != null) {
        throw new ReferenceCaptureError(
          sourceNode.id,
          '$transition',
          transitionRename.nextAccessor,
        )
      }
      replacements.push({ start, end, text })
    }

    const visit = (node: TypeScript.Node) => {
      if (
        transitionArgumentRename != null
        && TypeScript.isCallExpression(node)
        && TransitionExpression.getAccessor(node) === transitionArgumentRename.accessor
      ) {
        TransitionExpression.getArgumentProperties(node)
          .filter((property) => property.id === oldId)
          .forEach((property) => {
            const original = source.slice(
              property.nameNode.getStart(sourceFile),
              property.nameNode.end,
            )
            const quote = original.startsWith("'")
              ? "'"
              : original.startsWith('"')
                ? '"'
                : ''
            replacements.push({
              start: property.nameNode.getStart(sourceFile),
              end: property.nameNode.end,
              text: property.shorthand
                ? `${nextId}: ${oldId}`
                : quote.length > 0
                  ? `${quote}${nextId}${quote}`
                  : nextId,
            })
          })
      }
      const member = ExpressionReferenceSyntax.getMember(node)
      if (member != null) {
        if (member.root === '$transition') {
          addTransitionReference(
            member.id,
            member.nameNode.getStart(sourceFile),
            member.nameNode.end,
            ExpressionReferenceSyntax.createNameReplacement(
              member,
              transitionRename?.nextAccessor ?? member.id,
            ),
          )
        } else {
          addReference(
            member.root,
            member.id,
            member.nameNode.getStart(sourceFile),
            member.nameNode.end,
            ExpressionReferenceSyntax.createNameReplacement(member, nextId),
          )
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
    replacementTargetElement?: MebacoElement.Element,
  ): Result => {
    const targetNode = findNode(rootNode, targetNodeId)
    if (targetNode == null) throw new Error(`node-${targetNodeId} was not found.`)
    const oldId = 'id' in targetNode.element
      ? (targetNode.element as { id?: unknown }).id
      : null
    if (typeof oldId !== 'string') throw new Error(`node-${targetNodeId} does not define an Id.`)
    if (oldId === nextId) {
      return {
        rootNode,
        targetElement: replacementTargetElement ?? targetNode.element,
        changedNodeIds: [],
        occurrenceCount: 0,
      }
    }

    const graph = ReferenceGraph.build(rootNode, targetNodeId)
    const sourceNodeIds = new Set(graph.references.map((reference) => reference.sourceNodeId))
    if (replacementTargetElement != null) sourceNodeIds.add(targetNodeId)

    const nextRoot = cloneNode(rootNode)
    const changedNodeIds: number[] = []
    let occurrenceCount = 0
    collectNodes(nextRoot).forEach((node) => {
      if (!sourceNodeIds.has(node.id)) return
      const sourceNode = findNode(rootNode, node.id)
      if (sourceNode == null) throw new Error(`node-${node.id} was not found.`)
      const rewritten = rewriteValue(
        node.id === targetNodeId && replacementTargetElement != null
          ? replacementTargetElement
          : node.element,
        '',
        rootNode,
        sourceNode,
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
    return {
      rootNode: nextRoot,
      targetElement: nextTarget.element,
      changedNodeIds,
      occurrenceCount,
    }
  }
}

export default ExpressionReferenceRenamer
