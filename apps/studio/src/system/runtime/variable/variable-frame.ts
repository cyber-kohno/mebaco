namespace VariableFrame {
  type Binding = 'const' | 'let'
  type Metadata = {
    target: Record<string, unknown>
    bindings: Map<string, Binding>
    inherited: Set<string>
    getBinding: (id: string) => Binding | undefined
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
    const bindings = new Map<string, Binding>(Object.keys(target).map((id) => [
      id,
      parentMetadata?.getBinding(id) ?? 'const',
    ]))
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
    metadata.set(values, {
      target,
      bindings,
      inherited,
      getBinding: (id) => bindings.get(id),
    })
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

  export const createLinked = (
    parent: Record<string, unknown>,
  ): Frame => {
    const target: Record<string, unknown> = {}
    const bindings = new Map<string, Binding>()
    const values = new Proxy(target, {
      get: (current, property, receiver) => (
        Reflect.has(current, property)
          ? Reflect.get(current, property, receiver)
          : Reflect.get(parent, property)
      ),
      has: (current, property) => (
        Reflect.has(current, property) || Reflect.has(parent, property)
      ),
      ownKeys: (current) => [
        ...new Set([...Reflect.ownKeys(parent), ...Reflect.ownKeys(current)]),
      ],
      getOwnPropertyDescriptor: (current, property) => (
        Reflect.getOwnPropertyDescriptor(current, property)
        ?? (Reflect.has(parent, property)
          ? {
              configurable: true,
              enumerable: true,
              writable: true,
              value: Reflect.get(parent, property),
            }
          : undefined)
      ),
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
        if (Reflect.has(parent, property)) {
          return Reflect.set(parent, property, value)
        }
        throw new Error(`Variable '${property}' is not declared.`)
      },
      deleteProperty: (_current, property) => {
        throw new Error(`Variable '${String(property)}' cannot be deleted.`)
      },
    })
    const parentMetadata = metadata.get(parent)
    metadata.set(values, {
      target,
      bindings,
      inherited: new Set(),
      getBinding: (id) => (
        bindings.get(id)
        ?? parentMetadata?.getBinding(id)
        ?? (Reflect.has(parent, id) ? 'const' : undefined)
      ),
    })
    return {
      values,
      declare: (id, binding, value) => {
        if (bindings.has(id)) {
          throw new Error(`Variable '${id}' is already declared.`)
        }
        bindings.set(id, binding)
        target[id] = value
      },
    }
  }
}
export default VariableFrame
