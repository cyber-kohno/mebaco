namespace Block {
  export type Kind = 'block'

  export type Element = {
    kind: Kind
    label: string
  }

  export const create = (label = ''): Element => ({
    kind: 'block',
    label,
  })
}

export default Block
