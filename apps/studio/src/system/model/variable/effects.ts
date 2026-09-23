namespace Effects {
  export type Kind = 'effects'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'effects' })
}
export default Effects
