namespace Bundles {
  export type Kind = 'bundles'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'bundles' })
}

export default Bundles
