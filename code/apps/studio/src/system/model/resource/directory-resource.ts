import ResourceDefinition from './resource-definition'

namespace DirectoryResource {
  export type Kind = 'directory-resource'

  export type TextPolicy = {
    access: ResourceDefinition.Access
    pattern: string
  }

  export type SqlitePolicy = {
    access: ResourceDefinition.Access
    pattern: string
    create: boolean
  }

  export type Element = ResourceDefinition.Identity & {
    kind: Kind
    permissions: {
      access: ResourceDefinition.Access
      deleteFile: boolean
      text: TextPolicy | null
      sqlite: SqlitePolicy | null
    }
  }

  export const create = (
    id: string,
    resourceId?: string,
  ): Element => ({
    kind: 'directory-resource',
    ...ResourceDefinition.createIdentity(id, resourceId),
    permissions: {
      access: 'read',
      deleteFile: false,
      text: null,
      sqlite: null,
    },
  })
}

export default DirectoryResource
