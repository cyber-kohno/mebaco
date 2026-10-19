namespace ElseDirective {
  export type Kind = 'else'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'else' })
}
export default ElseDirective
