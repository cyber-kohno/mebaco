namespace Effect {
  export type Kind = 'effect'
  export type Dependency = {
    dependencyId: string
    type: 'formula'
    source: string
  }
  export type Action = {
    type: 'script'
    source: string
  }
  export type Element = {
    kind: Kind
    comment: string
    dependencies: Dependency[]
    action: Action
  }

  export const create = (
    comment = '',
    dependencies: Dependency[] = [],
    source = '',
  ): Element => ({
    kind: 'effect',
    comment,
    dependencies,
    action: { type: 'script', source },
  })
}

export default Effect
