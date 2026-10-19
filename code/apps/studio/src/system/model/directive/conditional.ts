namespace Conditional {
  export type Kind = 'conditional'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'conditional' })
}
export default Conditional
