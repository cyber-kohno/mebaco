namespace ResourceImports {
  export type Kind = 'resource-imports'
  export type Element = { kind: Kind; resourceIds: string[] }

  export const create = (): Element => ({ kind: 'resource-imports', resourceIds: [] })
}

export default ResourceImports
