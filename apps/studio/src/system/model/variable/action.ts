namespace Action {
  export type Kind = 'action'
  export type Element = { kind: Kind; comment: string; source: string }

  export const create = (comment: string, source: string): Element => ({
    kind: 'action',
    comment,
    source,
  })
}

export default Action
