namespace StyleValueSupport {
  export type Result = 'supported' | 'unsupported' | 'unknown'

  export const check = (
    property: string,
    value: string,
  ): Result => {
    if (property.length === 0 || value.length === 0) return 'unknown'
    if (property.startsWith('--')) return 'unknown'
    if (typeof CSS === 'undefined' || typeof CSS.supports !== 'function') return 'unknown'

    try {
      return CSS.supports(property, value) ? 'supported' : 'unsupported'
    } catch {
      return 'unknown'
    }
  }
}

export default StyleValueSupport
