namespace ProjectModel {
  export type Kind = 'project'

  export type Element = {
    kind: Kind
    projectId?: string
  }

  export const create = (): Element => ({
    kind: 'project',
    projectId: crypto.randomUUID(),
  })
}

export default ProjectModel
