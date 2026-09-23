namespace DebugConfigurations {
  export type Kind = 'debug-configurations'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'debug-configurations' })
}

export default DebugConfigurations
