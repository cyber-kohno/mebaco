namespace DebugResourceBindings {
  export type Kind = 'debug-resource-bindings'

  export type Binding = {
    resourceId: string
    path: string
  }

  export type Resource = {
    resourceId: string
    id: string
    resourceKind: 'directory-resource' | 'text-resource' | 'sqlite-resource'
  }

  export type Element = {
    kind: Kind
    bindings: Binding[]
  }

  export const create = (
    bindings: Binding[] = [],
  ): Element => ({
    kind: 'debug-resource-bindings',
    bindings,
  })

  export const normalizeBindings = (
    bindings: readonly Binding[],
    resources: readonly Resource[],
  ): Binding[] => {
    const pathByResourceId = new Map<string, string>()
    bindings.forEach((binding) => {
      if (!pathByResourceId.has(binding.resourceId)) {
        pathByResourceId.set(binding.resourceId, binding.path)
      }
    })
    return resources.map((resource) => ({
      resourceId: resource.resourceId,
      path: pathByResourceId.get(resource.resourceId) ?? '',
    }))
  }
}

export default DebugResourceBindings
