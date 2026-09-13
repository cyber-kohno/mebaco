import type FormulaContext from '../formula/formula-context'

namespace RuntimePartialRegistry {
  type Registration = {
    invalidate: () => void
    onCollisionChange: (message: string | null) => void
  }

  type State = {
    registrations: Map<string, Registration[]>
    disposed: boolean
  }

  const states = new WeakMap<FormulaContext.Invalidate, State>()

  const notifyCollision = (
    key: string,
    registrations: readonly Registration[],
  ) => {
    registrations.forEach((registration, index) => {
      registration.onCollisionChange(index === 0
        ? null
        : `Duplicate partial key '${key}' in the current component instance.`)
    })
  }

  export const create = (): FormulaContext.Invalidate => {
    const state: State = {
      registrations: new Map(),
      disposed: false,
    }
    const invalidate: FormulaContext.Invalidate = (key) => {
      if (typeof key !== 'string') {
        throw new Error('$invalidate() requires a string Partial key.')
      }
      if (key.length === 0) {
        throw new Error('$invalidate() requires a non-empty Partial key.')
      }
      if (state.disposed) {
        throw new Error('$invalidate() is not available after its component is disposed.')
      }

      const registrations = state.registrations.get(key) ?? []
      if (registrations.length === 0) {
        throw new Error(`Partial key '${key}' was not found in the current component instance.`)
      }
      if (registrations.length > 1) {
        throw new Error(
          `Partial key '${key}' is ambiguous because ${registrations.length} Tags are registered.`,
        )
      }
      registrations[0].invalidate()
    }
    states.set(invalidate, state)
    return invalidate
  }

  export const register = (
    invalidate: FormulaContext.Invalidate,
    key: string,
    requestInvalidation: () => void,
    onCollisionChange: (message: string | null) => void,
  ): (() => void) => {
    const state = states.get(invalidate)
    if (state == null || state.disposed) return () => {}

    const registration: Registration = {
      invalidate: requestInvalidation,
      onCollisionChange,
    }
    const registrations = [...(state.registrations.get(key) ?? []), registration]
    state.registrations.set(key, registrations)
    notifyCollision(key, registrations)

    return () => {
      if (state.disposed) return
      const current = state.registrations.get(key) ?? []
      const next = current.filter((candidate) => candidate !== registration)
      registration.onCollisionChange(null)
      if (next.length === 0) {
        state.registrations.delete(key)
        return
      }
      state.registrations.set(key, next)
      notifyCollision(key, next)
    }
  }

  export const dispose = (
    invalidate: FormulaContext.Invalidate,
  ) => {
    const state = states.get(invalidate)
    if (state == null) return
    state.disposed = true
    state.registrations.forEach((registrations) => {
      registrations.forEach((registration) => registration.onCollisionChange(null))
    })
    state.registrations.clear()
    states.delete(invalidate)
  }
}

export default RuntimePartialRegistry
