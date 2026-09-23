namespace AppId {
  export const pattern = /^[a-z][a-z0-9]*(?:-[a-z][a-z0-9]*)*$/

  export const isValid = (value: string): boolean => pattern.test(value)

  export const assertValid = (value: string): void => {
    if (!isValid(value)) {
      throw new Error(`Invalid App ID '${value}'. Expected strict lowercase kebab-case.`)
    }
  }

  export const toTransitionAccessor = (value: string): string => {
    assertValid(value)
    const accessor = value.replace(/-([a-z])/g, (_, character: string) => character.toUpperCase())
    if (!/^[a-z][A-Za-z0-9]*$/.test(accessor)) {
      throw new Error(`App ID '${value}' did not produce a valid transition accessor.`)
    }
    const restored = accessor.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
    if (restored !== value) {
      throw new Error(`App ID '${value}' did not round-trip through its transition accessor.`)
    }
    return accessor
  }
}

export default AppId
