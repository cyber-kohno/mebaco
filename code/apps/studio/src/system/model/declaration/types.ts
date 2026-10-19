namespace Types {
  export type Kind = 'types'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'types' })
}
export default Types
