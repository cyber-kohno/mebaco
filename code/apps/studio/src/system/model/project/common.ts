namespace Common {
  export type Kind = 'common'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'common' })
}

export default Common
