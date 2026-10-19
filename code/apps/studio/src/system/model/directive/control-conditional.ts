namespace ControlConditional {
  export type Kind = 'control-conditional'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'control-conditional' })
}
export default ControlConditional
