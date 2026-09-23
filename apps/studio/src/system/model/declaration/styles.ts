namespace Styles {
  export type Kind = 'styles'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'styles' })
}
export default Styles
