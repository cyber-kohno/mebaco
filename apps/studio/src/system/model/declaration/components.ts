namespace Components {
  export type Kind = 'components'
  export type Element = { kind: Kind }
  export const create = (): Element => ({ kind: 'components' })
}
export default Components
