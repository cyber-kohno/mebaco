namespace Case {
  export type Kind = 'case'
  export type Value =
    | { type: 'string'; value: string }
    | { type: 'number'; value: number }

  export type Element = {
    kind: Kind
    value: Value
  }

  export const create = (value: Value): Element => ({
    kind: 'case',
    value,
  })
}

export default Case
