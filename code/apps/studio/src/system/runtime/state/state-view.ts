import type ExecutionPolicy from '../execution-policy'

namespace StateView {
  type Metadata = {
    session: Session
    target: object
    policy: ExecutionPolicy.Value
    path: string
  }

  type Session = {
    caches: WeakMap<ExecutionPolicy.Value, WeakMap<object, object>>
  }

  const metadata = new WeakMap<object, Metadata>()
  const namespaceMetadata = new WeakMap<object, {
    target: Record<string, unknown>
    policy: ExecutionPolicy.Value
  }>()
  const aliasMetadata = new WeakMap<object, object>()
  const aliasCaches = new WeakMap<
    ExecutionPolicy.Value,
    WeakMap<object, object>
  >()

  const isObject = (value: unknown): value is object => (
    typeof value === 'object' && value !== null
  )

  const isPlainStateObject = (value: object): boolean => {
    if (Array.isArray(value)) return true
    const prototype = Reflect.getPrototypeOf(value)
    return prototype === Object.prototype || prototype === null
  }

  const unwrap = (value: unknown): unknown => (
    isObject(value) ? metadata.get(value)?.target ?? value : value
  )

  const appendPath = (
    path: string,
    property: PropertyKey,
  ): string => {
    if (typeof property === 'symbol') return `${path}[${String(property)}]`
    const value = String(property)
    return /^(?:0|[1-9]\d*)$/.test(value)
      ? `${path}[${value}]`
      : /^[A-Za-z_$][\w$]*$/.test(value)
      ? `${path}.${value}`
      : `${path}[${JSON.stringify(value)}]`
  }

  const mutationError = (
    path: string,
    operation: string,
    policy: ExecutionPolicy.Value,
  ): Error => new Error(
    `State '${path}' cannot be updated during ${policy.origin.type} evaluation (${operation}).`,
  )

  const unsupportedValueError = (
    path: string,
    value: object,
  ): Error => new Error(
    `State '${path}' contains unsupported mutable value '${value.constructor?.name ?? 'Object'}'.`,
  )

  const getCache = (
    session: Session,
    policy: ExecutionPolicy.Value,
  ): WeakMap<object, object> => {
    const existing = session.caches.get(policy)
    if (existing != null) return existing
    const created = new WeakMap<object, object>()
    session.caches.set(policy, created)
    return created
  }

  const wrap = <T>(
    value: T,
    session: Session,
    policy: ExecutionPolicy.Value,
    path: string,
  ): T => {
    if (!isObject(value)) return value

    const existingMetadata = metadata.get(value)
    const target = existingMetadata?.target ?? value
    if (!isPlainStateObject(target)) throw unsupportedValueError(path, target)

    const cache = getCache(session, policy)
    const cached = cache.get(target)
    if (cached != null) return cached as T

    const deny = (
      operation: string,
      property?: PropertyKey,
    ): never => {
      throw mutationError(
        property == null ? path : appendPath(path, property),
        operation,
        policy,
      )
    }
    const proxy = new Proxy(target, {
      get: (current, property, receiver) => wrap(
        Reflect.get(current, property, receiver),
        session,
        policy,
        appendPath(path, property),
      ),
      set: (current, property, nextValue) => {
        if (policy.stateAccess === 'readonly') return deny('set', property)
        return Reflect.set(current, property, unwrap(nextValue), current)
      },
      deleteProperty: (current, property) => {
        if (policy.stateAccess === 'readonly') return deny('delete', property)
        return Reflect.deleteProperty(current, property)
      },
      defineProperty: (current, property, descriptor) => {
        if (policy.stateAccess === 'readonly') return deny('define', property)
        if (
          descriptor.configurable !== true
          && 'value' in descriptor
          && isObject(descriptor.value)
        ) {
          throw new Error(
            `State '${appendPath(path, property)}' cannot use a non-configurable object value.`,
          )
        }
        const nextDescriptor = 'value' in descriptor
          ? { ...descriptor, value: unwrap(descriptor.value) }
          : descriptor
        return Reflect.defineProperty(current, property, nextDescriptor)
      },
      setPrototypeOf: (current, prototype) => {
        if (policy.stateAccess === 'readonly') return deny('set prototype')
        if (prototype !== Object.prototype && prototype !== null) {
          throw new Error(`State '${path}' cannot use a custom prototype.`)
        }
        return Reflect.setPrototypeOf(current, prototype)
      },
      preventExtensions: (current) => {
        if (policy.stateAccess === 'readonly') return deny('prevent extensions')
        return Reflect.preventExtensions(current)
      },
    })
    cache.set(target, proxy)
    metadata.set(proxy, { session, target, policy, path })
    return proxy as T
  }

  export const create = <T extends Record<string, unknown>>(
    state: T,
    policy: ExecutionPolicy.Value,
  ): T => {
    const existing = metadata.get(state)
    const session = existing?.session ?? { caches: new WeakMap() }
    const target = (existing?.target ?? state) as T
    return wrap(target, session, policy, '$state')
  }

  export const rebind = <T>(
    value: T,
    policy: ExecutionPolicy.Value,
  ): T => {
    if (!isObject(value)) return value
    const existing = metadata.get(value)
    if (existing != null) {
      return wrap(existing.target, existing.session, policy, existing.path) as T
    }

    const target = aliasMetadata.get(value) ?? value
    if (!isPlainStateObject(target)) return value
    let cache = aliasCaches.get(policy)
    if (cache == null) {
      cache = new WeakMap()
      aliasCaches.set(policy, cache)
    }
    const cached = cache.get(target)
    if (cached != null) return cached as T
    const proxy = new Proxy(target, {
      get: (current, property, receiver) => rebind(
        Reflect.get(current, property, receiver),
        policy,
      ),
      set: (current, property, nextValue) => Reflect.set(
        current,
        property,
        nextValue,
        current,
      ),
      deleteProperty: (current, property) => Reflect.deleteProperty(current, property),
      defineProperty: (current, property, descriptor) => Reflect.defineProperty(
        current,
        property,
        descriptor,
      ),
    })
    cache.set(target, proxy)
    aliasMetadata.set(proxy, target)
    return proxy as T
  }

  export const rebindNamespace = <T extends Record<string, unknown>>(
    namespace: T,
    policy: ExecutionPolicy.Value,
  ): T => {
    const existing = namespaceMetadata.get(namespace)
    if (existing?.policy === policy) return namespace
    const target = (existing?.target ?? namespace) as T
    const proxy = new Proxy(target, {
      get: (current, property, receiver) => rebind(
        Reflect.get(current, property, receiver),
        policy,
      ),
      set: (current, property, value) => Reflect.set(
        current,
        property,
        rebind(value, policy),
        current,
      ),
    })
    namespaceMetadata.set(proxy, { target, policy })
    return proxy
  }

  export const isView = (value: unknown): boolean => (
    isObject(value) && metadata.has(value)
  )
}

export default StateView
