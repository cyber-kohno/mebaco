namespace LaunchArguments {
  export type Kind = 'launch-arguments'
  export type Element = { kind: Kind }

  export const create = (): Element => ({ kind: 'launch-arguments' })
}

export default LaunchArguments
