namespace PromiseCatch {
  export type Kind = 'promise-catch'
  export type Element = { kind: Kind; id: string }

  export const create = (id = 'error'): Element => ({ kind: 'promise-catch', id })
}

export default PromiseCatch
