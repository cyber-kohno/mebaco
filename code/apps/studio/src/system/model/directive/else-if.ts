namespace ElseIfDirective {
  export type Kind = 'else-if'
  export type Element = { kind: Kind; condition: string }
  export const create = (condition = 'false'): Element => ({ kind: 'else-if', condition })
}
export default ElseIfDirective
