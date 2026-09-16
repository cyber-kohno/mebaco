import { describe, expect, it } from 'vitest'
import EffectRuntimeGuard from './effect-runtime-guard'

describe('EffectRuntimeGuard', () => {
  it('stops one Effect that repeatedly starts inside the guard window', () => {
    let now = 0
    const guard = EffectRuntimeGuard.create({
      effectLimit: 2,
      ownerLimit: 10,
      windowMs: 100,
      now: () => now,
    })

    expect(guard.allow(4)).toBeNull()
    expect(guard.allow(4)).toBeNull()
    expect(guard.allow(4)).toContain('dependency update loop')

    now = 100
    expect(guard.allow(4)).toBeNull()
  })

  it('stops a cycle distributed across Effects in one Store', () => {
    const guard = EffectRuntimeGuard.create({
      effectLimit: 10,
      ownerLimit: 3,
      windowMs: 100,
      now: () => 0,
    })

    expect(guard.allow(1)).toBeNull()
    expect(guard.allow(2)).toBeNull()
    expect(guard.allow(1)).toBeNull()
    expect(guard.allow(2)).toContain('dependency update loop')
  })
})
