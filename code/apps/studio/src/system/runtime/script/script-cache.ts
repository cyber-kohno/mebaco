namespace ScriptCache {
  export type Mode = 'expression' | 'action' | 'async-expression' | 'async-action' | 'code' | 'async-code'

  const maxEntries = 256
  const values = new Map<string, unknown>()

  const createKey = (
    mode: Mode,
    source: string,
  ): string => `${mode}\u0000${source}`

  export const get = <T>(
    mode: Mode,
    source: string,
  ): T | undefined => {
    const key = createKey(mode, source)
    const value = values.get(key) as T | undefined
    if (value === undefined) return undefined

    values.delete(key)
    values.set(key, value)
    return value
  }

  export const set = <T>(
    mode: Mode,
    source: string,
    value: T,
  ): T => {
    const key = createKey(mode, source)
    values.delete(key)
    values.set(key, value)

    if (values.size > maxEntries) {
      const oldestKey = values.keys().next().value
      if (oldestKey != null) values.delete(oldestKey)
    }

    return value
  }

  export const clear = () => {
    values.clear()
  }
}

export default ScriptCache
