namespace StyleLocals {
  export type Kind = 'style-locals'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'style-locals' })
}

export default StyleLocals
