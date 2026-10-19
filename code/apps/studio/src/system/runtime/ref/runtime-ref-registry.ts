import { tick } from 'svelte'
import type FormulaContext from '../formula/formula-context'
import type ScriptError from '../script/script-error'
import ScriptErrorValue from '../script/script-error'

namespace RuntimeRefRegistry {
  type Registration = {
    element: HTMLElement
    onCollisionChange: (message: string | null) => void
  }

  type State = {
    registrations: Map<string, Registration[]>
    queue: ScheduledCallback[]
    flushScheduled: boolean
    disposed: boolean
    options: CreateSystemOptions
  }

  type ScheduledCallback = {
    nodeId: number
    callback: () => void
    cancelled: boolean
    owner: ActionScope
  }

  type ActionScope = {
    nodeId: number
    callbacks: ScheduledCallback[]
    completed: boolean
    succeeded: boolean
    activeCallbackScope?: ActionScope
  }

  export type CreateSystemOptions = {
    requestRender?: () => void
    reportError?: (nodeId: number, error: ScriptError.Value) => void
    waitForRender?: () => Promise<void>
  }

  export type ActionTransaction = {
    system: FormulaContext.SystemValue
    complete: (succeeded: boolean) => void
  }

  const states = new WeakMap<FormulaContext.SystemValue, State>()

  const notifyCollision = (
    key: string,
    registrations: readonly Registration[],
  ) => {
    registrations.forEach((registration, index) => {
      registration.onCollisionChange(index === 0
        ? null
        : `Duplicate ref key '${key}' in the current component instance.`)
    })
  }

  const scheduleFlush = (
    state: State,
  ) => {
    if (state.disposed || state.flushScheduled || state.queue.length === 0) return
    state.flushScheduled = true

    queueMicrotask(async () => {
      await (state.options.waitForRender ?? tick)()
      state.flushScheduled = false
      if (state.disposed) return

      const callbacks = state.queue
      state.queue = []
      const errors: Array<{ nodeId: number; error: ScriptError.Value }> = []
      let executed = false

      callbacks.forEach((scheduled) => {
        if (scheduled.cancelled || state.disposed) return
        executed = true
        const callbackScope: ActionScope = {
          nodeId: scheduled.nodeId,
          callbacks: [],
          completed: false,
          succeeded: false,
        }
        scheduled.owner.activeCallbackScope = callbackScope
        try {
          scheduled.callback()
          callbackScope.completed = true
          callbackScope.succeeded = true
          state.queue.push(...callbackScope.callbacks.filter((item) => !item.cancelled))
        } catch (error) {
          callbackScope.completed = true
          callbackScope.callbacks.forEach((item) => { item.cancelled = true })
          errors.push({
            nodeId: scheduled.nodeId,
            error: ScriptErrorValue.fromUnknown('runtime', error),
          })
        } finally {
          scheduled.owner.activeCallbackScope = undefined
        }
      })

      if (executed && !state.disposed) state.options.requestRender?.()
      if (!state.disposed && errors.length > 0 && state.options.reportError != null) {
        if (state.options.requestRender != null) {
          await (state.options.waitForRender ?? tick)()
        }
        errors.forEach(({ nodeId, error }) => state.options.reportError?.(nodeId, error))
      }
      scheduleFlush(state)
    })
  }

  export const createSystem = (
    options: CreateSystemOptions = {},
  ): FormulaContext.SystemValue => {
    const state: State = {
      registrations: new Map(),
      queue: [],
      flushScheduled: false,
      disposed: false,
      options,
    }
    const system: FormulaContext.SystemValue = {
      getRef: (key) => {
        const registrations = state.registrations.get(key) ?? []
        if (registrations.length > 1) {
          throw new Error(
            `Ref key '${key}' is ambiguous because ${registrations.length} elements are registered.`,
          )
        }
        return registrations[0]?.element ?? null
      },
      afterRender: () => {
        throw new Error('$system.afterRender() can only be used while an Action is running.')
      },
    }
    states.set(system, state)
    return system
  }

  export const beginAction = (
    system: FormulaContext.SystemValue,
    nodeId: number,
  ): ActionTransaction => {
    const state = states.get(system)
    if (state == null || state.disposed) return { system, complete: () => {} }
    const scope: ActionScope = {
      nodeId,
      callbacks: [],
      completed: false,
      succeeded: false,
    }
    const actionSystem: FormulaContext.SystemValue = {
      ...system,
      afterRender: (callback) => {
        const targetScope = scope.activeCallbackScope ?? scope
        if (state.disposed || (targetScope.completed && !targetScope.succeeded)) return () => {}
        const scheduled: ScheduledCallback = {
          nodeId: targetScope.nodeId,
          callback,
          cancelled: false,
          owner: scope,
        }
        if (targetScope.completed) {
          state.queue.push(scheduled)
          scheduleFlush(state)
        } else {
          targetScope.callbacks.push(scheduled)
        }
        return () => { scheduled.cancelled = true }
      },
    }
    states.set(actionSystem, state)
    return {
      system: actionSystem,
      complete: (succeeded) => {
        if (scope.completed) return
        scope.completed = true
        scope.succeeded = succeeded
        if (!succeeded || state.disposed) {
          scope.callbacks.forEach((item) => { item.cancelled = true })
          return
        }
        state.queue.push(...scope.callbacks.filter((item) => !item.cancelled))
        scheduleFlush(state)
      },
    }
  }

  export const dispose = (
    system: FormulaContext.SystemValue,
  ) => {
    const state = states.get(system)
    if (state == null) return
    state.disposed = true
    state.queue.forEach((item) => { item.cancelled = true })
    state.queue = []
    state.registrations.clear()
    states.delete(system)
  }

  export const register = (
    system: FormulaContext.SystemValue,
    key: string,
    element: HTMLElement,
    onCollisionChange: (message: string | null) => void,
  ): (() => void) => {
    const state = states.get(system)
    if (state == null) return () => {}

    const registration: Registration = { element, onCollisionChange }
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
}

export default RuntimeRefRegistry
