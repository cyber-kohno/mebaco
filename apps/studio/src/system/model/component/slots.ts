namespace Slots {
  export type Kind = 'slots'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'slots' })
}

export default Slots
