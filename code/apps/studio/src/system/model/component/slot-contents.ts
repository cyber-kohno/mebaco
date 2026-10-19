namespace SlotContents {
  export type Kind = 'slot-contents'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'slot-contents' })
}

export default SlotContents
