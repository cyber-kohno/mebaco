namespace DefaultDirective {
  export type Kind = 'default'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'default' })
}
export default DefaultDirective
