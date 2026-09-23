namespace LaunchOptions {
  export type Kind = 'launch-options'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'launch-options' })
}

export default LaunchOptions
