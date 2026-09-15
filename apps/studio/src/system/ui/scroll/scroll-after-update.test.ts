import { describe, expect, it, vi } from 'vitest'
import ScrollAfterUpdate from './scroll-after-update'

describe('ScrollAfterUpdate', () => {
  it('scrolls a container to its end after the DOM update', async () => {
    const container = { scrollTop: 0, scrollHeight: 240 } as HTMLElement

    await ScrollAfterUpdate.toEnd(() => container)

    expect(container.scrollTop).toBe(240)
  })

  it('reveals a target after the DOM update', async () => {
    const scrollIntoView = vi.fn()
    const target = { scrollIntoView } as unknown as Element

    await ScrollAfterUpdate.reveal(() => target)

    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' })
  })
})
