namespace Props {
  export type Kind = 'props'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'props' })
}

export default Props
