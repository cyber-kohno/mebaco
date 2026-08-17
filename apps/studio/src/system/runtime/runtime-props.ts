import type ComponentReference from '../element/kind/component/component-reference'
import type ValuePropElement from '../element/kind/component/value-prop-element'
import TypeCatalog from '../element/kind/type/type-catalog'
import TypeExpression from '../element/kind/type/type-expression'
import FormulaContext from './formula/formula-context'
import FormulaEvaluator from './formula/formula-evaluator'
import ScriptError from './script/script-error'
import type RuntimeTree from './runtime-tree'
import type TreeNode from '../tree/tree-node'
import TypeValue from './type-value'

namespace RuntimeProps {
  export type Result = {
    values: Record<string, unknown>
    errors: string[]
  }

  export const empty = (): Result => ({ values: {}, errors: [] })

  const getProps = (
    componentNode: TreeNode.Node,
  ): ValuePropElement.Element[] => (
    componentNode.children
      .find((child) => child.element.kind === 'props')
      ?.children
      .map((child) => child.element)
      .filter((element): element is ValuePropElement.Element => element.kind === 'value-prop')
    ?? []
  )

  const getDefaultValue = (
    prop: ValuePropElement.Element,
    projectNode: TreeNode.Node,
  ): unknown => {
    if (prop.nullable) return null
    return getDefaultTypeValue(prop.valueType, projectNode)
  }

  const getDefaultTypeValue = (
    valueType: TypeExpression.Expression,
    projectNode: TreeNode.Node,
  ): unknown => {
    const { base, depth } = TypeExpression.unwrapArray(valueType)
    if (depth > 0) return []

    switch (base.type) {
      case 'string':
        return base.literals?.[0] ?? ''
      case 'number':
        return base.literals?.[0] ?? 0
      case 'boolean':
        return false
      case 'object':
        return Object.fromEntries(base.properties
          .filter((property) => !property.optional)
          .map((property) => [
            property.id,
            property.nullable
              ? null
              : getDefaultTypeValue(property.valueType, projectNode),
          ]))
      case 'reference':
        return TypeCatalog.createDefaultObject(projectNode, base.objectTypeIds[0] ?? '')
      case 'named':
        return TypeCatalog.createDefaultNamedType(projectNode, base.namedTypeId)
    }
  }

  const coerceLiteral = (
    prop: ValuePropElement.Element,
    value: string,
  ): unknown => {
    const { base } = TypeExpression.unwrapArray(prop.valueType)
    switch (base.type) {
      case 'string':
        return value
      case 'number':
        return Number(value)
      case 'boolean':
        return value === 'true'
      default:
        return value
    }
  }

  const isCompatibleValue = (
    prop: ValuePropElement.Element,
    value: unknown,
    projectNode: TreeNode.Node,
  ): boolean => {
    if (value === null) return prop.nullable
    const { base, depth } = TypeExpression.unwrapArray(prop.valueType)
    if (depth > 0) return Array.isArray(value)
    switch (base.type) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && Number.isFinite(value)
      case 'boolean':
        return typeof value === 'boolean'
      case 'object':
      case 'reference':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      case 'named':
        return TypeValue.isCompatible(prop.valueType, value, projectNode)
    }
  }

  const resolveSource = (
    prop: ValuePropElement.Element,
    source: ValuePropElement.Element['defaultValue'] | ComponentReference.ValueBindingSource,
    context: FormulaContext.Value,
    projectNode: TreeNode.Node,
  ): { ok: true; value: unknown } | { ok: false; message: string } => {
    if (source == null) return { ok: false, message: `Prop '${prop.id}' is required.` }
    switch (source.type) {
      case 'default':
        return { ok: true, value: getDefaultValue(prop, projectNode) }
      case 'literal':
        return { ok: true, value: coerceLiteral(prop, source.value) }
      case 'formula': {
        const result = FormulaEvaluator.evaluateExpression(source.source, context)
        return result.ok
          ? { ok: true, value: result.value }
          : { ok: false, message: `Prop '${prop.id}': ${ScriptError.format(result.error)}` }
      }
    }
  }

  export const resolveEntry = (
    runtime: RuntimeTree.AppRuntime,
    componentNode: TreeNode.Node,
    baseContext: FormulaContext.Value,
  ): Result => {
    const entry = runtime.entryNode?.element
    if (entry?.kind !== 'entry') return empty()

    return resolveBindings(
      componentNode,
      entry.propBindings ?? [],
      baseContext,
      runtime.projectNode,
    )
  }

  export const resolveBindings = (
    componentNode: TreeNode.Node,
    bindings: readonly ComponentReference.Binding[],
    baseContext: FormulaContext.Value,
    projectNode: TreeNode.Node,
  ): Result => {
    const values: Record<string, unknown> = {}
    const errors: string[] = []

    getProps(componentNode).forEach((prop) => {
      const binding = bindings.find((candidate) => candidate.propId === prop.propId)
      const result = resolveSource(
        prop,
        binding?.source ?? prop.defaultValue,
        FormulaContext.create({ ...baseContext, $props: values }),
        projectNode,
      )
      if (!result.ok) {
        errors.push(result.message)
        return
      }
      if (!isCompatibleValue(prop, result.value, projectNode)) {
        errors.push(`Prop '${prop.id}' resolved to an incompatible value.`)
        return
      }
      values[prop.id] = result.value
    })

    return { values, errors }
  }
}

export default RuntimeProps
