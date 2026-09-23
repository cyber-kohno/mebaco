namespace Transitions {
  export type Kind = 'transitions'
  export type Element = { kind: Kind; appIds: string[] }

  export const create = (): Element => ({ kind: 'transitions', appIds: [] })
}

export default Transitions
