import ResourceDefinition from './resource-definition'

namespace TextResource {
  export type Kind = 'text-resource'
  export type Element = ResourceDefinition.Identity & {
    kind: Kind
    access: ResourceDefinition.Access
  }

  export const create = (
    id: string,
    resourceId?: string,
    access: ResourceDefinition.Access = 'read',
  ): Element => ({
    kind: 'text-resource',
    ...ResourceDefinition.createIdentity(id, resourceId),
    access,
  })
}

export default TextResource
