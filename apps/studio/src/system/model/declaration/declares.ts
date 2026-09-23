namespace Declares {
  export type Kind = 'declares'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'declares' })
}
export default Declares
