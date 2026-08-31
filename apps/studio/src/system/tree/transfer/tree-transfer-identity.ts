import type MebacoElement from '../../element/element'
import type TypeExpression from '../../element/kind/type/type-expression'
import TreeTransferCatalog from './tree-transfer-catalog'
import type TreeNode from '../tree-node'

namespace TreeTransferIdentity {
  export type CopyResult = {
    node: TreeNode.Node
    nextNodeId: number
  }

  const remapTypeExpression = (
    expression: TypeExpression.Expression,
    definitionIds: ReadonlyMap<string, string>,
  ) => {
    if (expression.type === 'array') {
      remapTypeExpression(expression.item, definitionIds)
      return
    }
    if (expression.type === 'reference') {
      expression.objectTypeIds = expression.objectTypeIds.map(
        (id) => definitionIds.get(id) ?? id,
      )
      return
    }
    if (expression.type === 'named') {
      expression.namedTypeId = definitionIds.get(expression.namedTypeId)
        ?? expression.namedTypeId
      return
    }
    if (expression.type !== 'object') return
    expression.properties.forEach((property) => {
      property.propertyId = crypto.randomUUID()
      remapTypeExpression(property.valueType, definitionIds)
    })
  }

  const collectStyleParameterIds = (
    node: TreeNode.Node,
    result = new Map<string, string>(),
  ): Map<string, string> => {
    if (node.element.kind === 'style-param') {
      result.set(node.element.parameterId, crypto.randomUUID())
    }
    node.children.forEach((child) => collectStyleParameterIds(child, result))
    return result
  }

  const cloneElement = (
    element: MebacoElement.Element,
    copiedName: string,
    definitionIds: ReadonlyMap<string, string>,
    styleParameterIds: ReadonlyMap<string, string>,
    isRoot: boolean,
  ): MebacoElement.Element => {
    const clone = structuredClone(element)

    switch (clone.kind) {
      case 'style':
        if (isRoot) clone.id = copiedName
        clone.styleId = definitionIds.get(clone.styleId) ?? clone.styleId
        clone.bases.forEach((base) => {
          base.referenceId = crypto.randomUUID()
          base.styleId = definitionIds.get(base.styleId) ?? base.styleId
          base.arguments.forEach((argument) => {
            argument.parameterId = styleParameterIds.get(argument.parameterId)
              ?? argument.parameterId
          })
        })
        break
      case 'style-param':
        clone.parameterId = styleParameterIds.get(clone.parameterId)
          ?? clone.parameterId
        break
      case 'object-type':
        if (isRoot) clone.id = copiedName
        clone.typeId = definitionIds.get(clone.typeId) ?? clone.typeId
        clone.baseObjectIds = clone.baseObjectIds.map(
          (id) => definitionIds.get(id) ?? id,
        )
        clone.properties.forEach((property) => {
          property.propertyId = crypto.randomUUID()
          remapTypeExpression(property.valueType, definitionIds)
        })
        break
      case 'union-type':
        if (isRoot) clone.id = copiedName
        clone.typeId = definitionIds.get(clone.typeId) ?? clone.typeId
        if (clone.definition.type === 'object') {
          clone.definition.objectTypeIds = clone.definition.objectTypeIds.map(
            (id) => definitionIds.get(id) ?? id,
          )
        }
        break
      case 'signature-type':
        if (isRoot) clone.id = copiedName
        clone.typeId = definitionIds.get(clone.typeId) ?? clone.typeId
        clone.parameters.forEach((parameter) => {
          parameter.parameterId = crypto.randomUUID()
          remapTypeExpression(parameter.valueType, definitionIds)
        })
        if (clone.returnType != null) {
          remapTypeExpression(clone.returnType.valueType, definitionIds)
        }
        break
    }
    return clone
  }

  export const copy = (
    sourceNode: TreeNode.Node,
    copiedName: string,
    firstNodeId: number,
  ): CopyResult => {
    if (!TreeTransferCatalog.isTransferableKind(sourceNode.element.kind)) {
      throw new Error(`Element '${sourceNode.element.kind}' cannot be copied.`)
    }

    const rootDefinitionId = (() => {
      switch (sourceNode.element.kind) {
        case 'style': return sourceNode.element.styleId
        case 'object-type':
        case 'union-type':
        case 'signature-type': return sourceNode.element.typeId
        default: throw new Error(`Element '${sourceNode.element.kind}' cannot be copied.`)
      }
    })()
    const definitionIds = new Map([[rootDefinitionId, crypto.randomUUID()]])
    const styleParameterIds = sourceNode.element.kind === 'style'
      ? collectStyleParameterIds(sourceNode)
      : new Map<string, string>()
    let nextNodeId = firstNodeId

    const cloneNode = (node: TreeNode.Node, isRoot = false): TreeNode.Node => ({
      id: nextNodeId++,
      element: cloneElement(
        node.element,
        copiedName,
        definitionIds,
        styleParameterIds,
        isRoot,
      ),
      isOpen: node.isOpen,
      disabled: node.disabled,
      children: node.children.map((child) => cloneNode(child)),
    })

    return { node: cloneNode(sourceNode, true), nextNodeId }
  }
}

export default TreeTransferIdentity
