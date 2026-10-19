import SwitchValueType from '@system/model/directive/switch-value-type'
import type TreeNode from '@system/model/tree/tree-node'
import TypeCatalog from '@system/model/type-system/type-catalog'
import UnionDefinition from '@system/model/type-system/union/union-definition'

namespace Switch {
  export type Kind = 'switch'
  export type ValueType = SwitchValueType.Definition

  export type Element = {
    kind: Kind
    valueType: ValueType
    source: string
  }

  export const create = (
    valueType: ValueType,
    source: string,
  ): Element => ({
    kind: 'switch',
    valueType,
    source,
  })

  export const normalizeValueType = (
    valueType: unknown,
  ): ValueType => (
    SwitchValueType.parse(
      typeof valueType === 'string' ? valueType : JSON.stringify(valueType),
    ) ?? SwitchValueType.createFromLegacy(valueType)
  )

  export const getLiteralUnionOptions = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): SwitchValueType.LiteralUnionOption[] => (
    TypeCatalog.collectVisibleUnions(rootNode, targetNodeId)
      .filter((entry) => entry.element.definition.type === 'literal')
      .map((entry) => {
        const definition = entry.element.definition as UnionDefinition.Literal
        return {
          value: entry.element.typeId,
          label: entry.element.id,
          valueType: definition.valueType,
          values: definition.values,
          title: UnionDefinition.getTypeScriptType(definition, () => undefined),
        }
      })
  )

  export const findLiteralUnion = (
    rootNode: TreeNode.Node,
    unionTypeId: string,
  ): UnionDefinition.Literal | undefined => {
    const union = TypeCatalog.findUnion(rootNode, unionTypeId)?.element.definition
    return union?.type === 'literal' ? union : undefined
  }
}

export default Switch
