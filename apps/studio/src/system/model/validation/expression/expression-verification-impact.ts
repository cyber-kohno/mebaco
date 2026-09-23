namespace ExpressionVerificationImpact {
  export type Value =
    | { type: 'none' }
    | { type: 'nodes'; nodeIds: readonly number[] }
    | { type: 'all' }

  export const none = (): Value => ({ type: 'none' })

  export const nodes = (
    nodeIds: readonly number[],
  ): Value => {
    const uniqueNodeIds = [...new Set(nodeIds)]
    return uniqueNodeIds.length === 0
      ? none()
      : { type: 'nodes', nodeIds: uniqueNodeIds }
  }

  export const all = (): Value => ({ type: 'all' })

  export const merge = (
    ...impacts: readonly Value[]
  ): Value => {
    if (impacts.some((impact) => impact.type === 'all')) return all()
    return nodes(impacts.flatMap((impact) => (
      impact.type === 'nodes' ? impact.nodeIds : []
    )))
  }

  export const hasImpact = (
    impact: Value,
  ): boolean => impact.type !== 'none'
}

export default ExpressionVerificationImpact
