namespace VariableFrame {
  type Binding = 'const' | 'let'
  type Metadata = {
    target: Record<string, unknown>
    bindings: Map<string, Binding>
  }
  export type Frame = {
    values: Record<string, unknown>
    declare: (id: string, binding: Binding, value: unknown) => void
  }
  const metadata = new WeakMap<Record<string, unknown>, Metadata>()

  export const create = (
    parent: Record<string, unknown>,
  ): Frame => {
    const parentMetadata = metadata.get(parent)
    const target = { ...parent }
    const bindings = new Map<string, Binding>(
      parentMetadata?.bindings
      ?? Object.keys(parent).map((id) => [id, 'const'] as const),
    )
    const values = new Proxy(target, {
      set: (current, property, value) => {
        if (typeof property !== 'string' || !bindings.has(property)) {
          throw new Error(`Variable '${String(property)}' is not declared.`)
        }
        if (bindings.get(property) === 'const') {
          throw new Error(`Variable '${property}' is readonly.`)
        }
        current[property] = value
        return true
      },
      deleteProperty: (_current, property) => {
        throw new Error(`Variable '${String(property)}' cannot be deleted.`)
      },
    })
    metadata.set(values, { target, bindings })
    return {
      values,
      declare: (id, binding, value) => {
        if (bindings.has(id)) throw new Error(`Variable '${id}' is already declared.`)
        bindings.set(id, binding)
        target[id] = value
      },
    }
  }
}
export default VariableFrame
