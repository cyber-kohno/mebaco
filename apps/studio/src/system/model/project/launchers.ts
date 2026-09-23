namespace Launchers {
  export type Kind = 'launchers'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'launchers' })
}

export default Launchers
