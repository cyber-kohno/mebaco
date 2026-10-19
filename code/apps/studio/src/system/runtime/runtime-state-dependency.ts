namespace RuntimeStateDependency {
  export type Dependency = string
  export type Tracker = <T>(evaluate: () => T) => T

  type Collector = Set<Dependency>

  let nextSourceId = 1
  const stack: Collector[] = []

  export const createSourceId = (): string => `state-${nextSourceId++}`

  export const createDependency = (
    sourceId: string,
    property: PropertyKey,
  ): Dependency | null => (
    typeof property === 'string' || typeof property === 'number'
      ? `${sourceId}:${String(property)}`
      : null
  )

  export const trackRead = (
    sourceId: string,
    property: PropertyKey,
  ) => {
    const collector = stack.at(-1)
    if (collector == null) return
    const dependency = createDependency(sourceId, property)
    if (dependency != null) collector.add(dependency)
  }

  export const track = <T>(
    evaluate: () => T,
  ): { value: T; dependencies: readonly Dependency[] } => {
    const collector: Collector = new Set()
    stack.push(collector)
    try {
      return {
        value: evaluate(),
        dependencies: [...collector],
      }
    } finally {
      stack.pop()
    }
  }

  export const passthrough: Tracker = (evaluate) => evaluate()
}

export default RuntimeStateDependency
