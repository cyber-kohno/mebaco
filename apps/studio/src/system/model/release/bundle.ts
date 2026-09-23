namespace Bundle {
  export type Kind = 'bundle'
  export type Element = {
    kind: Kind
    bundleId: string
    id: string
    launcherIds: string[]
    revision?: {
      generation: number
      contentHash: string
      builtAt: string
    }
  }

  export const create = (
    id: string,
    bundleId: string = crypto.randomUUID(),
  ): Element => ({ kind: 'bundle', bundleId, id, launcherIds: [] })
}

export default Bundle
