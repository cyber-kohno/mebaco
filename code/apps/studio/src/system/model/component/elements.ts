namespace Elements {
  export type Kind = 'elements'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'elements' })
}

export default Elements
