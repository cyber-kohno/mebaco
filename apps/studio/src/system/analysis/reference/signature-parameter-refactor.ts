import TypeScript from 'typescript'
import type MebacoElement from '../../element/element'
import type SignatureTypeElement from '../../element/kind/type/signature/signature-type-element'
import type FunctionElement from '../../element/kind/function/function-element'
import SignatureDefinition from '../../element/kind/type/signature/signature-definition'
import type TreeNode from '../../tree/tree-node'
import ElementExpressionFields from './element-expression-fields'
import ExpressionReferenceSyntax from './expression-reference-syntax'

namespace SignatureParameterRefactor {
  export type Result = {
    rootNode: TreeNode.Node
    changedNodeIds: readonly number[]
    updatedOccurrenceCount: number
    orderChanged: boolean
  }

  export class ReferenceCaptureError extends Error {
    constructor(
      readonly sourceNodeId: number,
      readonly parameterName: string,
    ) {
      super(`Signature Parameter '${parameterName}' cannot be reused because $args.${parameterName} still references a removed Parameter at node-${sourceNodeId}.`)
      this.name = 'ReferenceCaptureError'
    }
  }

  const expressionFields = ElementExpressionFields.direct
  const jsonFields = ElementExpressionFields.referenceJson

  const cloneNode = (node: TreeNode.Node): TreeNode.Node => ({
    ...node,
    children: node.children.map(cloneNode),
  })

  const isObject = (value: unknown): value is Record<string, unknown> => (
    value != null && typeof value === 'object' && !Array.isArray(value)
  )

  const rewriteExpression = (
    source: string,
    sourceNodeId: number,
    previousByName: ReadonlyMap<string, SignatureDefinition.Parameter>,
    currentByParameterId: ReadonlyMap<string, SignatureDefinition.Parameter>,
    currentByName: ReadonlyMap<string, SignatureDefinition.Parameter>,
  ): { source: string; count: number } => {
    if (source.trim().length === 0) return { source, count: 0 }
    const sourceFile = TypeScript.createSourceFile(
      'mebaco-signature-parameter-refactoring.ts',
      source,
      TypeScript.ScriptTarget.Latest,
      true,
      TypeScript.ScriptKind.TS,
    )
    const replacements: Array<{ start: number; end: number; text: string }> = []

    const visit = (node: TypeScript.Node) => {
      const member = ExpressionReferenceSyntax.getMember(node)
      if (member?.root === '$args') {
        const previousParameter = previousByName.get(member.id)
        if (previousParameter != null) {
          const currentParameter = currentByParameterId.get(previousParameter.parameterId)
          if (currentParameter == null) {
            const captured = currentByName.get(member.id)
            if (captured != null && captured.parameterId !== previousParameter.parameterId) {
              throw new ReferenceCaptureError(sourceNodeId, member.id)
            }
          } else if (currentParameter.id !== previousParameter.id) {
            replacements.push({
              start: member.nameNode.getStart(sourceFile),
              end: member.nameNode.end,
              text: ExpressionReferenceSyntax.createNameReplacement(member, currentParameter.id),
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
    sourceNodeId: number,
    previousByName: ReadonlyMap<string, SignatureDefinition.Parameter>,
    currentByParameterId: ReadonlyMap<string, SignatureDefinition.Parameter>,
    currentByName: ReadonlyMap<string, SignatureDefinition.Parameter>,
  ): { value: unknown; count: number } => {
    if (typeof value === 'string') {
      if (jsonFields.has(key)) {
        try {
          const parsed = JSON.parse(value)
          const rewritten = rewriteValue(
            parsed,
            key,
            sourceNodeId,
            previousByName,
            currentByParameterId,
            currentByName,
          )
          if (rewritten.count > 0) {
            return { value: JSON.stringify(rewritten.value), count: rewritten.count }
          }
        } catch (error) {
          if (error instanceof ReferenceCaptureError) throw error
          // Plain expressions are intentionally handled below.
        }
      }
      if (!expressionFields.has(key)) return { value, count: 0 }
      const rewritten = rewriteExpression(
        value,
        sourceNodeId,
        previousByName,
        currentByParameterId,
        currentByName,
      )
      return { value: rewritten.source, count: rewritten.count }
    }
    if (Array.isArray(value)) {
      let count = 0
      const result = value.map((item) => {
        const rewritten = rewriteValue(
          item,
          key,
          sourceNodeId,
          previousByName,
          currentByParameterId,
          currentByName,
        )
        count += rewritten.count
        return rewritten.value
      })
      return { value: count > 0 ? result : value, count }
    }
    if (!isObject(value)) return { value, count: 0 }

    let count = 0
    const result: Record<string, unknown> = { ...value }
    Object.entries(value).forEach(([childKey, child]) => {
      const rewritten = rewriteValue(
        child,
        childKey,
        sourceNodeId,
        previousByName,
        currentByParameterId,
        currentByName,
      )
      if (rewritten.count > 0) result[childKey] = rewritten.value
      count += rewritten.count
    })
    return { value: count > 0 ? result : value, count }
  }

  export const apply = (
    rootNode: TreeNode.Node,
    signatureNodeId: number,
    previousElement: SignatureTypeElement.Element,
    currentElement: SignatureTypeElement.Element,
  ): Result => {
    if (previousElement.typeId !== currentElement.typeId) {
      throw new Error('Signature Type identity cannot be changed.')
    }
    const definitionDiff = SignatureDefinition.diffParameters(
      previousElement.parameters,
      currentElement.parameters,
    )
    const hasRenames = definitionDiff.updated.some(({ previous, current }) => (
      previous.id !== current.id
    ))
    const removedNamesReused = definitionDiff.removed.some(({ member: removed }) => (
      currentElement.parameters.some((current) => (
        current.id === removed.id && current.parameterId !== removed.parameterId
      ))
    ))
    const orderChanged = definitionDiff.reordered.length > 0
    if (!hasRenames && !removedNamesReused) {
      return { rootNode, changedNodeIds: [], updatedOccurrenceCount: 0, orderChanged }
    }

    const previousByName = new Map(previousElement.parameters.map((parameter) => (
      [parameter.id, parameter]
    )))
    const currentByParameterId = new Map(currentElement.parameters.map((parameter) => (
      [parameter.parameterId, parameter]
    )))
    const currentByName = new Map(currentElement.parameters.map((parameter) => (
      [parameter.id, parameter]
    )))
    const resultRoot = cloneNode(rootNode)
    const changedNodeIds: number[] = []
    let updatedOccurrenceCount = 0

    const visit = (
      previousNode: TreeNode.Node,
      currentNode: TreeNode.Node,
      insideTargetFunction: boolean,
    ) => {
      const nextInsideTargetFunction = previousNode.element.kind === 'function'
        ? previousNode.element.signature.mode === 'refer'
          && previousNode.element.signature.signatureTypeId === previousElement.typeId
        : insideTargetFunction
      if (nextInsideTargetFunction && previousNode.id !== signatureNodeId) {
        const rewritten = rewriteValue(
          previousNode.element,
          '',
          previousNode.id,
          previousByName,
          currentByParameterId,
          currentByName,
        )
        if (rewritten.count > 0) {
          currentNode.element = rewritten.value as MebacoElement.Element
          changedNodeIds.push(previousNode.id)
          updatedOccurrenceCount += rewritten.count
        }
      }
      previousNode.children.forEach((child, index) => {
        visit(child, currentNode.children[index], nextInsideTargetFunction)
      })
    }
    visit(rootNode, resultRoot, false)

    return { rootNode: resultRoot, changedNodeIds, updatedOccurrenceCount, orderChanged }
  }

  export type FunctionResult = Result & {
    element: FunctionElement.Element
  }

  export const applyFunction = (
    rootNode: TreeNode.Node,
    functionNodeId: number,
    previousElement: FunctionElement.Element,
    currentElement: FunctionElement.Element,
  ): FunctionResult => {
    if (
      previousElement.signature.mode !== 'inline'
      || currentElement.signature.mode !== 'inline'
    ) {
      return {
        rootNode,
        element: currentElement,
        changedNodeIds: [],
        updatedOccurrenceCount: 0,
        orderChanged: false,
      }
    }

    const previousDefinition = previousElement.signature.definition
    const currentDefinition = currentElement.signature.definition
    const definitionDiff = SignatureDefinition.diffParameters(
      previousDefinition.parameters,
      currentDefinition.parameters,
    )
    const hasRenames = definitionDiff.updated.some(({ previous, current }) => (
      previous.id !== current.id
    ))
    const removedNamesReused = definitionDiff.removed.some(({ member: removed }) => (
      currentDefinition.parameters.some((current) => (
        current.id === removed.id && current.parameterId !== removed.parameterId
      ))
    ))
    const orderChanged = definitionDiff.reordered.length > 0
    if (!hasRenames && !removedNamesReused) {
      return {
        rootNode,
        element: currentElement,
        changedNodeIds: [],
        updatedOccurrenceCount: 0,
        orderChanged,
      }
    }

    const previousByName = new Map(previousDefinition.parameters.map((parameter) => (
      [parameter.id, parameter]
    )))
    const currentByParameterId = new Map(currentDefinition.parameters.map((parameter) => (
      [parameter.parameterId, parameter]
    )))
    const currentByName = new Map(currentDefinition.parameters.map((parameter) => (
      [parameter.id, parameter]
    )))
    const rewrittenElement = currentElement.implementation.mode === 'code'
      ? { value: currentElement, count: 0 }
      : rewriteValue(
          currentElement,
          '',
          functionNodeId,
          previousByName,
          currentByParameterId,
          currentByName,
        )
    const resultRoot = cloneNode(rootNode)
    const functionNode = (() => {
      const find = (node: TreeNode.Node): TreeNode.Node | null => {
        if (node.id === functionNodeId) return node
        for (const child of node.children) {
          const found = find(child)
          if (found != null) return found
        }
        return null
      }
      return find(resultRoot)
    })()
    const changedNodeIds: number[] = []
    let updatedOccurrenceCount = rewrittenElement.count
    if (rewrittenElement.count > 0) changedNodeIds.push(functionNodeId)

    const visitChildren = (node: TreeNode.Node) => {
      node.children.forEach((child) => {
        if (child.element.kind === 'function') return
        const rewritten = rewriteValue(
          child.element,
          '',
          child.id,
          previousByName,
          currentByParameterId,
          currentByName,
        )
        if (rewritten.count > 0) {
          child.element = rewritten.value as MebacoElement.Element
          changedNodeIds.push(child.id)
          updatedOccurrenceCount += rewritten.count
        }
        visitChildren(child)
      })
    }
    if (functionNode != null) visitChildren(functionNode)

    return {
      rootNode: resultRoot,
      element: rewrittenElement.value as FunctionElement.Element,
      changedNodeIds,
      updatedOccurrenceCount,
      orderChanged,
    }
  }
}

export default SignatureParameterRefactor
