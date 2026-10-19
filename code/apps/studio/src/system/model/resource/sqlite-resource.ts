import ResourceDefinition from './resource-definition'

namespace SqliteResource {
  export type Kind = 'sqlite-resource'
  export type Element = ResourceDefinition.Identity & {
    kind: Kind
    access: ResourceDefinition.Access
    create: boolean
  }

  export const create = (
    id: string,
    resourceId?: string,
    access: ResourceDefinition.Access = 'read',
    createFile = false,
  ): Element => ({
    kind: 'sqlite-resource',
    ...ResourceDefinition.createIdentity(id, resourceId),
    access,
    create: createFile,
  })
}

export default SqliteResource
