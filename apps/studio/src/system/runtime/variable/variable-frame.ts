namespace VariableFrame {
  type Binding = 'const' | 'let'
  type Metadata = {
    target: Record<string, unknown>
    bindings: Map<string, Binding>
    inherited: Set<string>
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
    const inherited = new Set(Object.keys(target))
    const bindings = new Map<string, Binding>(
      parentMetadata?.bindings
      ?? Object.keys(target).map((id) => [id, 'const'] as const),
    )
    const values = new Proxy(target, {
      set: (current, property, value, receiver) => {
        if (typeof property !== 'string') {
          throw new Error(`Variable '${String(property)}' is not declared.`)
        }
        if (bindings.has(property)) {
          if (bindings.get(property) === 'const') {
            throw new Error(`Variable '${property}' is readonly.`)
          }
          return Reflect.set(current, property, value, receiver)
        }
        if (!bindings.has(property)) {
          throw new Error(`Variable '${String(property)}' is not declared.`)
        }
        return Reflect.set(current, property, value, receiver)
      },
      deleteProperty: (_current, property) => {
        throw new Error(`Variable '${String(property)}' cannot be deleted.`)
      },
    })
    metadata.set(values, { target, bindings, inherited })
    return {
      values,
      declare: (id, binding, value) => {
        if (bindings.has(id) && !inherited.has(id)) {
          throw new Error(`Variable '${id}' is already declared.`)
        }
        inherited.delete(id)
        bindings.set(id, binding)
        target[id] = value
      },
    }
  }
}
export default VariableFrame
