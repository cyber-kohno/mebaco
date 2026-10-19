import { ReferenceImpact } from '@system/model/reference/impact'
import type TreeNode from '@system/model/tree/tree-node'
import TypeExpression from '@system/model/type-system/type-expression'
import TypeLiteralLabel from '@system/model/type-system/type-literal-label'
import type UnionDefinition from '@system/model/type-system/union/union-definition'

namespace UnionDefinitionUpdatePolicy {
  type UnionElement = Extract<TreeNode.Node['element'], { kind: 'union-type' }>

  export type Conflict = {
    nodeId: number
    sourceLabel: string
    detail?: string
  }

  export class IncompatibleUpdateError extends Error {
    constructor(
      readonly unionId: string,
      readonly conflicts: readonly Conflict[],
    ) {
      super('Incompatible Union Type update.')
      this.name = 'IncompatibleUnionUpdateError'
    }
  }

  const isDirectScalarUnion = (
    valueType: TypeExpression.Expression,
    unionTypeId: string,
  ): boolean => {
    const { base, depth } = TypeExpression.unwrapArray(valueType)
    return depth === 0
      && base.type === 'named'
      && base.namedTypeId === unionTypeId
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

  const parseStoredLiteral = (
    definition: UnionDefinition.Literal,
    value: string,
  ): string | number => definition.valueType === 'number'
    ? Number(value)
    : value

  const isAllowedLiteral = (
    definition: UnionDefinition.Definition,
    value: string | number,
    valueType: UnionDefinition.LiteralValueType,
  ): boolean => definition.type === 'literal'
    && definition.valueType === valueType
    && definition.values.some((candidate) => Object.is(candidate, value))

  const formatLiteral = (
    value: string | number,
  ): string => TypeLiteralLabel.format(value)

  const collectValueConflict = (
    node: TreeNode.Node,
    unionTypeId: string,
    previous: UnionDefinition.Literal,
    next: UnionDefinition.Definition,
  ): Conflict | null => {
    const element = node.element
    const source = element.kind === 'state'
      && isDirectScalarUnion(element.valueType, unionTypeId)
      ? { label: 'state#initial', value: element.initial }
      : element.kind === 'value-prop'
        && isDirectScalarUnion(element.valueType, unionTypeId)
        ? { label: 'value-prop#defaultValue', value: element.defaultValue }
        : element.kind === 'launch-argument'
          && isDirectScalarUnion(element.valueType, unionTypeId)
          ? { label: 'launch-argument#defaultValue', value: element.defaultValue }
          : null
    if (source?.value?.type !== 'literal') return null

    const literal = parseStoredLiteral(previous, source.value.value)
    return isAllowedLiteral(next, literal, previous.valueType)
      ? null
      : {
          nodeId: node.id,
          sourceLabel: source.label,
          detail: formatLiteral(literal),
        }
  }

  const collectSwitchConflicts = (
    node: TreeNode.Node,
    previous: UnionDefinition.Literal,
    next: UnionDefinition.Definition,
  ): Conflict[] => {
    if (node.element.kind !== 'switch' && node.element.kind !== 'control-switch') return []
    if (next.type !== 'literal') {
      return [{ nodeId: node.id, sourceLabel: `${node.element.kind}#valueType` }]
    }

    return node.children
      .filter((child) => child.element.kind === 'case')
      .map((child): Conflict | null => {
        if (child.element.kind !== 'case') return null
        const literal = child.element.value.value
        return isAllowedLiteral(next, literal, previous.valueType)
          ? null
          : {
              nodeId: child.id,
              sourceLabel: 'case#value',
              detail: formatLiteral(literal),
            }
      })
      .filter((conflict): conflict is Conflict => conflict != null)
  }

  export const collectConflicts = (
    rootNode: TreeNode.Node,
    unionNodeId: number,
    previousElement: UnionElement,
    nextElement: UnionElement,
  ): readonly Conflict[] => {
    if (JSON.stringify(previousElement.definition) === JSON.stringify(nextElement.definition)) {
      return []
    }
    if (previousElement.definition.type !== 'literal') return []
    const previousDefinition = previousElement.definition

    const sourceNodeIds = new Set(
      ReferenceImpact.collectReferences(rootNode, [unionNodeId], 'structural')
        .map((reference) => reference.sourceNodeId),
    )
    const conflicts: Conflict[] = []
    sourceNodeIds.forEach((sourceNodeId) => {
      const sourceNode = findNode(rootNode, sourceNodeId)
      if (sourceNode == null) return
      const valueConflict = collectValueConflict(
        sourceNode,
        previousElement.typeId,
        previousDefinition,
        nextElement.definition,
      )
      if (valueConflict != null) conflicts.push(valueConflict)
      conflicts.push(...collectSwitchConflicts(
        sourceNode,
        previousDefinition,
        nextElement.definition,
      ))
    })
    return conflicts.sort((left, right) => (
      left.nodeId - right.nodeId || left.sourceLabel.localeCompare(right.sourceLabel)
    ))
  }

  export const assertCompatible = (
    rootNode: TreeNode.Node,
    unionNodeId: number,
    previousElement: UnionElement,
    nextElement: UnionElement,
  ) => {
    const conflicts = collectConflicts(
      rootNode,
      unionNodeId,
      previousElement,
      nextElement,
    )
    if (conflicts.length > 0) {
      throw new IncompatibleUpdateError(nextElement.id, conflicts)
    }
  }
}

export default UnionDefinitionUpdatePolicy
