import { getContext, setContext } from 'svelte'

const contextKey = Symbol('mebaco-render-instance-scope')

const current = (): string => getContext<string>(contextKey) ?? 'root'

export const extendRenderInstanceScope = (
  nodeId: number,
  iterationIndex: number,
): void => {
  setContext(contextKey, `${current()}-loop${nodeId}i${iterationIndex}`)
}

export const getRenderInstanceKey = (nodeId: number): string => (
  `${current()}-node${nodeId}`
)
