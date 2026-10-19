namespace Resources {
  export type Kind = 'resources'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'resources' })
}

export default Resources
