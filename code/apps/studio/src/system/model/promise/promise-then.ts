namespace PromiseThen {
  export type Kind = 'promise-then'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'promise-then' })
}

export default PromiseThen
