namespace EffectRuntimeGuard {
  export type Options = {
    effectLimit?: number
    ownerLimit?: number
    windowMs?: number
    now?: () => number
  }

  export type Guard = {
    allow: (nodeId: number) => string | null
  }

  export const create = (options: Options = {}): Guard => {
    const effectLimit = options.effectLimit ?? 32
    const ownerLimit = options.ownerLimit ?? 64
    const windowMs = options.windowMs ?? 1_000
    const now = options.now ?? Date.now
    const ownerStarts: number[] = []
    const startsByNode = new Map<number, number[]>()

    const prune = (values: number[], current: number) => {
      while (values.length > 0 && current - values[0] >= windowMs) values.shift()
    }

    return {
      allow: (nodeId) => {
        const current = now()
        prune(ownerStarts, current)
        const effectStarts = startsByNode.get(nodeId) ?? []
        prune(effectStarts, current)
        startsByNode.set(nodeId, effectStarts)

        if (effectStarts.length >= effectLimit || ownerStarts.length >= ownerLimit) {
          return 'Effect execution was stopped because its dependencies continued changing. Check for a dependency update loop.'
        }
        effectStarts.push(current)
        ownerStarts.push(current)
        return null
      },
    }
  }
}

export default EffectRuntimeGuard
