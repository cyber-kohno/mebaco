namespace FunctionProcedure {
  export type Kind = 'function-procedure'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'function-procedure' })
}
export default FunctionProcedure
