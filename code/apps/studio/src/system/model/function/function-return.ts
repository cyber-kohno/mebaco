namespace FunctionReturn {
  export type Kind = 'function-return'
  export type Element = { kind: Kind; source?: string }

  export const create = (source?: string): Element => source == null
    ? { kind: 'function-return' }
    : { kind: 'function-return', source }
}
export default FunctionReturn
