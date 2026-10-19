namespace IfDirective {
  export type Kind = 'if'
  export type Element = { kind: Kind; condition: string }
  export const create = (condition = 'true'): Element => ({ kind: 'if', condition })
}
export default IfDirective
