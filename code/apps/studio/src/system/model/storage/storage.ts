namespace Storage {
  export type Kind = 'storage'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'storage' })
}

export default Storage
