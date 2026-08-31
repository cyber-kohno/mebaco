import TypeScript from 'typescript'
import type MebacoElement from '../../element/element'
import type LoopElement from '../../element/kind/directive/loop-element'
import type TreeNode from '../../tree/tree-node'
import ElementExpressionFields from './element-expression-fields'
import ExpressionReferenceSyntax from './expression-reference-syntax'
import ScopedVariableResolver from './scoped-variable-resolver'

namespace LoopReferenceRefactor {
  export type RemovedReference = {
    sourceNodeId: number
    sourceLabel: string
    occurrenceCount: number
  }

  export type Plan = {
    rootNode: TreeNode.Node
    changedNodeIds: readonly number[]
    updatedOccurrenceCount: number
    removedReferences: readonly RemovedReference[]
    removedOccurrenceCount: number
    verificationReset: boolean
  }

  export class ReferenceCaptureError extends Error {
    constructor(
      readonly sourceNodeId: number,
      readonly variableId: string,
    ) {
      super(`Changing the Loop variables would change the target of '$var.${variableId}' at node-${sourceNodeId}. Choose another variable Id.`)
      this.name = 'LoopReferenceCaptureError'
    }
  }

  type RewriteResult = {
    value: unknown
    replacementCount: number
    removedCount: number
    itemReferenceCount: number
    removedLabels: Readonly<Record<string, number>>
  }

  const expressionFields = ElementExpressionFields.direct
  const jsonFields = ElementExpressionFields.referenceJson

  const isObject = (value: unknown): value is Record<string, unknown> => (
    value != null && typeof value === 'object' && !Array.isArray(value)
  )

  const addRemovedLabels = (
    target: Record<string, number>,
    source: Readonly<Record<string, number>>,
  ) => {
    Object.entries(source).forEach(([label, count]) => {
      target[label] = (target[label] ?? 0) + count
    })
  }

  const cloneNode = (node: TreeNode.Node): TreeNode.Node => ({
    ...node,
    children: node.children.map(cloneNode),
  })

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

  const sameBinding = (
    left: ScopedVariableResolver.Binding | null,
    right: ScopedVariableResolver.Binding | null,
  ): boolean => (
    left?.node.id === right?.node.id
    && left?.declaration === right?.declaration
  )

  const isTargetBinding = (
    binding: ScopedVariableResolver.Binding | null,
    loopNodeId: number,
  ): binding is ScopedVariableResolver.Binding => (
    binding?.node.id === loopNodeId
    && (binding.declaration === 'loop-index' || binding.declaration === 'loop-item')
  )

  const getNextId = (
    declaration: ScopedVariableResolver.Declaration,
    nextElement: LoopElement.Element,
  ): string | null => {
    if (declaration === 'loop-index') return nextElement.indexId
    if (declaration === 'loop-item') {
      return nextElement.mode === 'collection' ? nextElement.itemId : null
    }
    return null
  }

  const rewriteExpression = (
    source: string,
    previousRoot: TreeNode.Node,
    nextScopeRoot: TreeNode.Node,
    sourceNode: TreeNode.Node,
    loopNodeId: number,
    nextElement: LoopElement.Element,
  ): { source: string; replacementCount: number; removedCount: number; itemReferenceCount: number } => {
    if (source.trim().length === 0) {
      return { source, replacementCount: 0, removedCount: 0, itemReferenceCount: 0 }
    }
    const sourceFile = TypeScript.createSourceFile(
      'mebaco-loop-reference-refactor.ts',
      source,
      TypeScript.ScriptTarget.Latest,
      true,
      TypeScript.ScriptKind.TS,
    )
    const replacements: Array<{ start: number; end: number; text: string }> = []
    let removedCount = 0
    let itemReferenceCount = 0

    const visit = (node: TypeScript.Node) => {
      const member = ExpressionReferenceSyntax.getMember(node)
      if (member?.root === '$var') {
        const previousBinding = ScopedVariableResolver.resolve(
          previousRoot,
          sourceNode.id,
          member.id,
        )
        if (isTargetBinding(previousBinding, loopNodeId)) {
          if (previousBinding.declaration === 'loop-item') itemReferenceCount += 1
          const nextId = getNextId(previousBinding.declaration, nextElement)
          if (nextId == null) {
            removedCount += 1
          } else {
            const nextBinding = ScopedVariableResolver.resolve(
              nextScopeRoot,
              sourceNode.id,
              nextId,
            )
            if (
              nextBinding?.node.id !== loopNodeId
              || nextBinding.declaration !== previousBinding.declaration
            ) {
              throw new ReferenceCaptureError(sourceNode.id, nextId)
            }
            if (nextId !== member.id) {
              replacements.push({
                start: member.nameNode.getStart(sourceFile),
                end: member.nameNode.end,
                text: ExpressionReferenceSyntax.createNameReplacement(member, nextId),
              })
            }
          }
        } else {
          const nextBinding = ScopedVariableResolver.resolve(
            nextScopeRoot,
            sourceNode.id,
            member.id,
          )
          if (
            isTargetBinding(nextBinding, loopNodeId)
            && !sameBinding(previousBinding, nextBinding)
          ) {
            throw new ReferenceCaptureError(sourceNode.id, member.id)
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
    return {
      source: nextSource,
      replacementCount: replacements.length,
      removedCount,
      itemReferenceCount,
    }
  }

  const rewriteValue = (
    value: unknown,
    key: string,
    sourceLabel: string,
    previousRoot: TreeNode.Node,
    nextScopeRoot: TreeNode.Node,
    sourceNode: TreeNode.Node,
    loopNodeId: number,
    nextElement: LoopElement.Element,
  ): RewriteResult => {
    if (typeof value === 'string') {
      if (jsonFields.has(key)) {
        try {
          const parsed = JSON.parse(value)
          const rewritten = rewriteValue(
            parsed,
            key,
            key,
            previousRoot,
            nextScopeRoot,
            sourceNode,
            loopNodeId,
            nextElement,
          )
          return {
            ...rewritten,
            value: rewritten.replacementCount > 0
              ? JSON.stringify(rewritten.value)
              : value,
          }
        } catch (error) {
          if (error instanceof ReferenceCaptureError) throw error
          // A non-JSON string may still be a direct expression field.
        }
      }
      if (!expressionFields.has(key)) {
        return {
          value,
          replacementCount: 0,
          removedCount: 0,
          itemReferenceCount: 0,
          removedLabels: {},
        }
      }
      const rewritten = rewriteExpression(
        value,
        previousRoot,
        nextScopeRoot,
        sourceNode,
        loopNodeId,
        nextElement,
      )
      return {
        value: rewritten.source,
        replacementCount: rewritten.replacementCount,
        removedCount: rewritten.removedCount,
        itemReferenceCount: rewritten.itemReferenceCount,
        removedLabels: rewritten.removedCount > 0
          ? { [sourceLabel.length > 0 ? sourceLabel : key]: rewritten.removedCount }
          : {},
      }
    }
    if (Array.isArray(value)) {
      let replacementCount = 0
      let removedCount = 0
      let itemReferenceCount = 0
      const removedLabels: Record<string, number> = {}
      const result = value.map((item) => {
        const rewritten = rewriteValue(
          item,
          key,
          sourceLabel,
          previousRoot,
          nextScopeRoot,
          sourceNode,
          loopNodeId,
          nextElement,
        )
        replacementCount += rewritten.replacementCount
        removedCount += rewritten.removedCount
        itemReferenceCount += rewritten.itemReferenceCount
        addRemovedLabels(removedLabels, rewritten.removedLabels)
        return rewritten.value
      })
      return {
        value: replacementCount > 0 ? result : value,
        replacementCount,
        removedCount,
        itemReferenceCount,
        removedLabels,
      }
    }
    if (!isObject(value)) {
      return {
        value,
        replacementCount: 0,
        removedCount: 0,
        itemReferenceCount: 0,
        removedLabels: {},
      }
    }

    let replacementCount = 0
    let removedCount = 0
    let itemReferenceCount = 0
    const removedLabels: Record<string, number> = {}
    const result: Record<string, unknown> = { ...value }
    Object.entries(value).forEach(([childKey, child]) => {
      const rewritten = rewriteValue(
        child,
        childKey,
        sourceLabel.length > 0 ? sourceLabel : childKey,
        previousRoot,
        nextScopeRoot,
        sourceNode,
        loopNodeId,
        nextElement,
      )
      if (rewritten.replacementCount > 0) result[childKey] = rewritten.value
      replacementCount += rewritten.replacementCount
      removedCount += rewritten.removedCount
      itemReferenceCount += rewritten.itemReferenceCount
      addRemovedLabels(removedLabels, rewritten.removedLabels)
    })
    return {
      value: replacementCount > 0 ? result : value,
      replacementCount,
      removedCount,
      itemReferenceCount,
      removedLabels,
    }
  }

  export const plan = (
    rootNode: TreeNode.Node,
    loopNodeId: number,
    previousElement: LoopElement.Element,
    nextElement: LoopElement.Element,
  ): Plan => {
    const previousLoopNode = findNode(rootNode, loopNodeId)
    if (previousLoopNode?.element.kind !== 'loop') {
      throw new Error(`node-${loopNodeId} is not a Loop.`)
    }

    const nextScopeRoot = cloneNode(rootNode)
    const nextScopeLoop = findNode(nextScopeRoot, loopNodeId)
    if (nextScopeLoop == null) throw new Error(`node-${loopNodeId} was not found.`)
    nextScopeLoop.element = nextElement

    const resultRoot = cloneNode(rootNode)
    const resultLoop = findNode(resultRoot, loopNodeId)
    if (resultLoop == null) throw new Error(`node-${loopNodeId} was not found.`)

    const changedNodeIds: number[] = []
    const removedReferences = new Map<string, RemovedReference>()
    let updatedOccurrenceCount = 0
    let removedOccurrenceCount = 0
    let itemReferenceCount = 0

    const visit = (previousNode: TreeNode.Node) => {
      const resultNode = findNode(resultRoot, previousNode.id)
      if (resultNode == null) throw new Error(`node-${previousNode.id} was not found.`)
      const rewritten = rewriteValue(
        previousNode.element,
        '',
        '',
        rootNode,
        nextScopeRoot,
        previousNode,
        loopNodeId,
        nextElement,
      )
      if (rewritten.replacementCount > 0) {
        resultNode.element = rewritten.value as MebacoElement.Element
        changedNodeIds.push(previousNode.id)
        updatedOccurrenceCount += rewritten.replacementCount
      }
      if (rewritten.removedCount > 0) {
        Object.entries(rewritten.removedLabels).forEach(([fieldLabel, occurrenceCount]) => {
          const sourceLabel = `${previousNode.element.kind}#${fieldLabel}`
          removedReferences.set(`${previousNode.id}:${sourceLabel}`, {
            sourceNodeId: previousNode.id,
            sourceLabel,
            occurrenceCount,
          })
        })
        removedOccurrenceCount += rewritten.removedCount
      }
      itemReferenceCount += rewritten.itemReferenceCount
      previousNode.children.forEach(visit)
    }
    previousLoopNode.children.forEach(visit)

    const collectionSourceChanged = (
      previousElement.mode === 'collection'
      && nextElement.mode === 'collection'
      && previousElement.collectionSource !== nextElement.collectionSource
    )
    return {
      rootNode: resultRoot,
      changedNodeIds,
      updatedOccurrenceCount,
      removedReferences: [...removedReferences.values()],
      removedOccurrenceCount,
      verificationReset: (
        removedOccurrenceCount > 0
        || (collectionSourceChanged && itemReferenceCount > 0)
      ),
    }
  }
}

export default LoopReferenceRefactor
