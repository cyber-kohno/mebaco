import { describe, expect, it, vi } from 'vitest'
import RuntimePartialRegistry from './runtime-partial-registry'

describe('RuntimePartialRegistry', () => {
  it('invalidates the registered Tag and stops after unregistering', () => {
    const invalidate = RuntimePartialRegistry.create()
    const requestInvalidation = vi.fn()
    const unregister = RuntimePartialRegistry.register(
      invalidate,
      'task-3',
      requestInvalidation,
      () => {},
    )

    invalidate('task-3')
    expect(requestInvalidation).toHaveBeenCalledOnce()

    unregister()
    expect(() => invalidate('task-3')).toThrow(
      "Partial key 'task-3' was not found in the current component instance.",
    )
  })

  it('reports duplicate keys and rejects ambiguous invalidation', () => {
    const invalidate = RuntimePartialRegistry.create()
    const firstCollision = vi.fn()
    const secondCollision = vi.fn()
    const unregisterFirst = RuntimePartialRegistry.register(
      invalidate,
      'task-3',
      vi.fn(),
      firstCollision,
    )
    const secondInvalidation = vi.fn()
    RuntimePartialRegistry.register(
      invalidate,
      'task-3',
      secondInvalidation,
      secondCollision,
    )

    expect(firstCollision).toHaveBeenLastCalledWith(null)
    expect(secondCollision).toHaveBeenLastCalledWith(
      "Duplicate partial key 'task-3' in the current component instance.",
    )
    expect(() => invalidate('task-3')).toThrow(
      "Partial key 'task-3' is ambiguous because 2 Tags are registered.",
    )

    unregisterFirst()
    expect(secondCollision).toHaveBeenLastCalledWith(null)
    invalidate('task-3')
    expect(secondInvalidation).toHaveBeenCalledOnce()
  })

  it('isolates identical keys between component instances', () => {
    const firstInvalidate = RuntimePartialRegistry.create()
    const secondInvalidate = RuntimePartialRegistry.create()
    const firstRequest = vi.fn()
    const secondRequest = vi.fn()

    RuntimePartialRegistry.register(firstInvalidate, 'content', firstRequest, () => {})
    RuntimePartialRegistry.register(secondInvalidate, 'content', secondRequest, () => {})

    firstInvalidate('content')
    expect(firstRequest).toHaveBeenCalledOnce()
    expect(secondRequest).not.toHaveBeenCalled()
  })

  it('validates calls and rejects use after disposal', () => {
    const invalidate = RuntimePartialRegistry.create()

    expect(() => invalidate('')).toThrow(
      '$invalidate() requires a non-empty Partial key.',
    )
    expect(() => (invalidate as (key: unknown) => void)(1)).toThrow(
      '$invalidate() requires a string Partial key.',
    )

    RuntimePartialRegistry.dispose(invalidate)
    expect(() => invalidate('content')).toThrow(
      '$invalidate() is not available after its component is disposed.',
    )
  })
})
