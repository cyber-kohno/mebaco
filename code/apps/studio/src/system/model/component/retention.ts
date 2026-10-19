namespace Retention {
  export type Kind = 'retention'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'retention' })
}

export default Retention
