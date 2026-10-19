namespace Debug {
  export type Kind = 'debug'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'debug' })
}

export default Debug
