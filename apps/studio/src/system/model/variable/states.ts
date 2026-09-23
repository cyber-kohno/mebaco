namespace States {
  export type Kind = 'states'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'states' })
}
export default States
