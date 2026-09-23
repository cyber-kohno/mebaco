namespace Slot {
  export type Kind = 'slot'

  export type Element = {
    kind: Kind
    slotId: string
    id: string
  }

  export const create = (
    id: string,
    slotId: string = crypto.randomUUID(),
  ): Element => ({ kind: 'slot', slotId, id })
}

export default Slot
