namespace Release {
  export type Kind = 'release'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'release' })
}

export default Release
