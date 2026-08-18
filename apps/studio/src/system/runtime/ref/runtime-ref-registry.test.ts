import { describe, expect, it, vi } from 'vitest'
import RuntimeRefRegistry from './runtime-ref-registry'

const flushScheduledCallbacks = async () => {
  for (let index = 0; index < 6; index += 1) await Promise.resolve()
}

describe('RuntimeRefRegistry', () => {
  it('registers and unregisters an element by its evaluated key', () => {
    const system = RuntimeRefRegistry.createSystem()
    const element = {} as HTMLElement
    const unregister = RuntimeRefRegistry.register(system, 'sidePanel', element, () => {})

    expect(system.getRef('sidePanel')).toBe(element)
    unregister()
    expect(system.getRef('sidePanel')).toBeNull()
  })

  it('reports duplicate keys without silently selecting an element', () => {
    const system = RuntimeRefRegistry.createSystem()
    const firstCollision = vi.fn()
    const secondCollision = vi.fn()
    const unregisterFirst = RuntimeRefRegistry.register(
      system,
      'recordFrame0',
      {} as HTMLElement,
      firstCollision,
    )
    RuntimeRefRegistry.register(
      system,
      'recordFrame0',
      {} as HTMLElement,
      secondCollision,
    )

    expect(firstCollision).toHaveBeenLastCalledWith(null)
    expect(secondCollision).toHaveBeenLastCalledWith(
      "Duplicate ref key 'recordFrame0' in the current component instance.",
    )
    expect(() => system.getRef('recordFrame0')).toThrow(
      "Ref key 'recordFrame0' is ambiguous because 2 elements are registered.",
    )

    unregisterFirst()
    expect(secondCollision).toHaveBeenLastCalledWith(null)
    expect(system.getRef('recordFrame0')).not.toBeNull()
  })

  it('isolates identical keys between component instances', () => {
    const firstSystem = RuntimeRefRegistry.createSystem()
    const secondSystem = RuntimeRefRegistry.createSystem()
    const firstElement = {} as HTMLElement
    const secondElement = {} as HTMLElement

    RuntimeRefRegistry.register(firstSystem, 'sidePanel', firstElement, () => {})
    RuntimeRefRegistry.register(secondSystem, 'sidePanel', secondElement, () => {})

    expect(firstSystem.getRef('sidePanel')).toBe(firstElement)
    expect(secondSystem.getRef('sidePanel')).toBe(secondElement)
  })

  it('runs a committed callback after waiting for the render', async () => {
    const requestRender = vi.fn()
    const waitForRender = vi.fn(async () => {})
    const callback = vi.fn()
    const system = RuntimeRefRegistry.createSystem({ requestRender, waitForRender })
    const transaction = RuntimeRefRegistry.beginAction(system, 12)

    system.afterRender(callback)
    expect(callback).not.toHaveBeenCalled()
    transaction.complete(true)
    await flushScheduledCallbacks()

    expect(waitForRender).toHaveBeenCalledTimes(1)
    expect(callback).toHaveBeenCalledTimes(1)
    expect(requestRender).toHaveBeenCalledTimes(1)
  })

  it('discards callbacks from failed Actions and supports cancellation', async () => {
    const failedCallback = vi.fn()
    const cancelledCallback = vi.fn()
    const system = RuntimeRefRegistry.createSystem({ waitForRender: async () => {} })

    const failed = RuntimeRefRegistry.beginAction(system, 1)
    system.afterRender(failedCallback)
    failed.complete(false)

    const cancelled = RuntimeRefRegistry.beginAction(system, 2)
    const cancel = system.afterRender(cancelledCallback)
    cancel()
    cancelled.complete(true)
    await flushScheduledCallbacks()

    expect(failedCallback).not.toHaveBeenCalled()
    expect(cancelledCallback).not.toHaveBeenCalled()
  })

  it('reports callback errors against the originating Action', async () => {
    const reportError = vi.fn()
    const system = RuntimeRefRegistry.createSystem({
      requestRender: vi.fn(),
      reportError,
      waitForRender: async () => {},
    })
    const transaction = RuntimeRefRegistry.beginAction(system, 42)
    system.afterRender(() => { throw new Error('after render failed') })
    transaction.complete(true)
    await flushScheduledCallbacks()

    expect(reportError).toHaveBeenCalledTimes(1)
    expect(reportError.mock.calls[0][0]).toBe(42)
    expect(reportError.mock.calls[0][1].message).toBe('after render failed')
  })

  it('drops pending callbacks when the component instance is disposed', async () => {
    const callback = vi.fn()
    const system = RuntimeRefRegistry.createSystem({ waitForRender: async () => {} })
    const transaction = RuntimeRefRegistry.beginAction(system, 1)
    system.afterRender(callback)
    transaction.complete(true)
    RuntimeRefRegistry.dispose(system)
    await flushScheduledCallbacks()

    expect(callback).not.toHaveBeenCalled()
  })

  it('rejects scheduling outside an Action', () => {
    const system = RuntimeRefRegistry.createSystem()

    expect(() => system.afterRender(() => {})).toThrow(
      '$system.afterRender() can only be used while an Action is running.',
    )
  })
})
