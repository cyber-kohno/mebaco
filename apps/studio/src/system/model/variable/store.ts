namespace Store {
  export type Kind = 'store'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'store' })
}
export default Store
