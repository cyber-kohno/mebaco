namespace ResourceDefinition {
  export type Identity = {
    resourceId: string
    id: string
    name?: string
  }

  export type Access = 'read' | 'read-write'

  export const createIdentity = (
    id: string,
    resourceId: string = crypto.randomUUID(),
  ): Identity => ({ resourceId, id })

  export const withOptionalName = <T extends Identity>(
    element: T,
    name: string | undefined,
  ): T => {
    const { name: _currentName, ...withoutName } = element
    return (name == null || name.trim().length === 0
      ? withoutName
      : { ...withoutName, name }) as T
  }

  export const parseAccess = (value: string): Access => (
    value === 'read-write' ? 'read-write' : 'read'
  )
}

export default ResourceDefinition
