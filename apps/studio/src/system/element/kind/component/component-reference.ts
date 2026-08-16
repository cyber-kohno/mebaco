import type ValuePropElement from './value-prop-element'

namespace ComponentReference {
  export type ValueBindingSource =
    | { type: 'literal'; value: string }
    | { type: 'formula'; source: string }

  export type ValueBinding = {
    propId: string
    kind: 'value'
    source: ValueBindingSource
  }

  export type Binding = ValueBinding

  export type Option = {
    componentId: string
    label: string
    props: readonly ValuePropElement.Element[]
  }

  export const parseBindings = (source: string): Binding[] | null => {
    try {
      const value: unknown = JSON.parse(source)
      return Array.isArray(value) && value.every(isBinding) ? value : null
    } catch {
      return null
    }
  }

  export const stringifyBindings = (
    bindings: readonly Binding[],
  ): string => JSON.stringify(bindings)

  export const normalizeBindings = (
    bindings: readonly Binding[],
    component: Option | undefined,
  ): Binding[] => {
    if (component == null) return []
    const propIds = new Set(component.props.map((prop) => prop.propId))
    const seen = new Set<string>()
    return bindings.filter((binding) => {
      if (!propIds.has(binding.propId) || seen.has(binding.propId)) return false
      seen.add(binding.propId)
      return true
    })
  }

  export const validateBindings = (
    source: string,
    component: Option | undefined,
  ): string | null => {
    const parsed = parseBindings(source)
    if (parsed == null) return 'Invalid component properties.'
    if (component == null) {
      return parsed.length === 0 ? null : 'Select a valid Component.'
    }

    const bindings = normalizeBindings(parsed, component)
    if (bindings.length !== parsed.length) return 'Component property binding is invalid.'

    for (const prop of component.props) {
      const binding = bindings.find((candidate) => candidate.propId === prop.propId)
      if (binding == null) {
        if (prop.defaultValue == null) return `Set a value for '${prop.id}'.`
        continue
      }

      if (binding.source.type === 'formula') {
        if (binding.source.source.trim().length === 0) {
          return `Enter a formula for '${prop.id}'.`
        }
        continue
      }

      const { base, depth } = unwrapValueType(prop)
      if (depth > 0 || base === 'reference') {
        return `Use a formula for '${prop.id}'.`
      }
      if (
        base === 'number'
        && (
          binding.source.value.trim().length === 0
          || !Number.isFinite(Number(binding.source.value))
        )
      ) return `Enter a valid number for '${prop.id}'.`
      if (
        base === 'boolean'
        && binding.source.value !== 'true'
        && binding.source.value !== 'false'
      ) return `Select true or false for '${prop.id}'.`
    }

    return null
  }

  const unwrapValueType = (
    prop: ValuePropElement.Element,
  ): { base: ValuePropElement.Element['valueType']['type']; depth: number } => {
    let valueType = prop.valueType
    let depth = 0
    while (valueType.type === 'array') {
      valueType = valueType.item
      depth += 1
    }
    return { base: valueType.type, depth }
  }

  const isBinding = (value: unknown): value is Binding => {
    if (value == null || typeof value !== 'object') return false
    const binding = value as {
      propId?: unknown
      kind?: unknown
      source?: unknown
    }
    if (typeof binding.propId !== 'string' || binding.kind !== 'value') return false
    if (binding.source == null || typeof binding.source !== 'object') return false
    const source = binding.source as { type?: unknown; value?: unknown; source?: unknown }
    return (
      source.type === 'literal' && typeof source.value === 'string'
      || source.type === 'formula' && typeof source.source === 'string'
    )
  }
}

export default ComponentReference
