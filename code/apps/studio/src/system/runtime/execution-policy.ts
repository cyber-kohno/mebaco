namespace ExecutionPolicy {
  export type StateAccess = 'readonly' | 'mutable'

  export type OriginType =
    | 'runtime'
    | 'render'
    | 'retention'
    | 'event'
    | 'effect'
    | 'launch'

  export type Value = Readonly<{
    stateAccess: StateAccess
    origin: Readonly<{
      type: OriginType
      nodeId: number
    }>
    currentNodeId: number
  }>

  export const mutable: Value = Object.freeze({
    stateAccess: 'mutable',
    origin: Object.freeze({ type: 'runtime', nodeId: 0 }),
    currentNodeId: 0,
  })

  export const create = (
    stateAccess: StateAccess,
    type: OriginType,
    nodeId: number,
  ): Value => Object.freeze({
    stateAccess,
    origin: Object.freeze({ type, nodeId }),
    currentNodeId: nodeId,
  })

  export const forNode = (
    policy: Value,
    nodeId: number,
  ): Value => policy.currentNodeId === nodeId
    ? policy
    : Object.freeze({ ...policy, currentNodeId: nodeId })
}

export default ExecutionPolicy
