namespace Imports {
  export type Kind = 'imports'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'imports' })
}

export default Imports
