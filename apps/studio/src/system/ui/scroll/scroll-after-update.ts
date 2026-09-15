import { tick } from 'svelte'

namespace ScrollAfterUpdate {
  export const toEnd = async (
    getContainer: () => HTMLElement | null | undefined,
  ): Promise<void> => {
    await tick()
    const container = getContainer()
    if (container != null) container.scrollTop = container.scrollHeight
  }

  export const reveal = async (
    getTarget: () => Element | null | undefined,
  ): Promise<void> => {
    await tick()
    getTarget()?.scrollIntoView({ block: 'nearest' })
  }
}

export default ScrollAfterUpdate
