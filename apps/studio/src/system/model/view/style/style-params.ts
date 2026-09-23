namespace StyleParams {
  export type Kind = 'style-params'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'style-params' })
}

export default StyleParams
