import type TreeNode from '@system/model/tree/tree-node'
import TypeDefaultExpression from '@system/model/type-system/type-default-expression'
import TypeExpression from '@system/model/type-system/type-expression'
import type ComponentReference from './component-reference'

namespace ValueBindingReconciler {
  const createSource = (
    rootNode: TreeNode.Node,
    prop: ComponentReference.Prop,
  ): ComponentReference.ValueBindingSource => {
    const { base, depth } = TypeExpression.unwrapArray(prop.valueType)
    if (!prop.nullable && depth === 0) {
      if (base.type === 'string') {
        return { type: 'literal', value: base.literals?.[0] ?? '' }
      }
      if (base.type === 'number') {
        return { type: 'literal', value: String(base.literals?.[0] ?? 0) }
      }
      if (base.type === 'boolean') return { type: 'literal', value: 'false' }
    }
    return {
      type: 'formula',
      source: TypeDefaultExpression.create(rootNode, prop.valueType, prop.nullable),
    }
  }

  const valueTypeChanged = (
    previous: ComponentReference.Prop,
    prop: ComponentReference.Prop,
  ): boolean => (
    previous.nullable !== prop.nullable
    || JSON.stringify(previous.valueType) !== JSON.stringify(prop.valueType)
  )

  export const add = (
    rootNode: TreeNode.Node,
    bindings: readonly ComponentReference.Binding[],
    prop: ComponentReference.Prop,
  ): ComponentReference.Binding[] => {
    if (
      prop.defaultValue != null
      || bindings.some((binding) => binding.propId === prop.propId)
    ) return [...bindings]
    return [
      ...bindings,
      { propId: prop.propId, kind: 'value', source: createSource(rootNode, prop) },
    ]
  }

  export const update = (
    rootNode: TreeNode.Node,
    bindings: readonly ComponentReference.Binding[],
    previous: ComponentReference.Prop,
    prop: ComponentReference.Prop,
  ): ComponentReference.Binding[] => {
    const currentIndex = bindings.findIndex((binding) => binding.propId === prop.propId)
    const changed = valueTypeChanged(previous, prop)
    if (prop.defaultValue != null) {
      return bindings.filter((binding) => binding.propId !== prop.propId)
    }
    const defaultRemoved = previous.defaultValue != null
    if (!changed && !defaultRemoved) return [...bindings]

    const nextBinding: ComponentReference.ValueBinding = {
      propId: prop.propId,
      kind: 'value',
      source: createSource(rootNode, prop),
    }
    if (currentIndex < 0) return [...bindings, nextBinding]
    return bindings.map((binding, index) => index === currentIndex ? nextBinding : binding)
  }

  export const remove = (
    bindings: readonly ComponentReference.Binding[],
    propId: string,
  ): ComponentReference.Binding[] => (
    bindings.filter((binding) => binding.propId !== propId)
  )
}

export default ValueBindingReconciler
