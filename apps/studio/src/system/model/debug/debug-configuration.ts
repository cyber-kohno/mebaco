namespace DebugConfiguration {
  export type Kind = 'debug-configuration'

  export type DefaultElement = {
    kind: Kind
    configurationId: string
    role: 'default'
  }

  export type CustomElement = {
    kind: Kind
    configurationId: string
    role: 'custom'
    name: string
  }

  export type Element = DefaultElement | CustomElement

  export const createDefault = (
    configurationId: string = crypto.randomUUID(),
  ): DefaultElement => ({
    kind: 'debug-configuration',
    configurationId,
    role: 'default',
  })

  export const createCustom = (
    name: string,
    configurationId: string = crypto.randomUUID(),
  ): CustomElement => ({
    kind: 'debug-configuration',
    configurationId,
    role: 'custom',
    name,
  })
}

export default DebugConfiguration
