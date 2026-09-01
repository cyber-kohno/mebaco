namespace ResourceDefinition {
  export type Identity = {
    resourceId: string
    id: string
  }

  export type Access = 'read' | 'read-write'

  export const createIdentity = (
    id: string,
    resourceId: string = crypto.randomUUID(),
  ): Identity => ({ resourceId, id })

  export const parseAccess = (value: string): Access => (
    value === 'read-write' ? 'read-write' : 'read'
  )
}

export default ResourceDefinition
