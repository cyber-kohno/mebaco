namespace EffectDependencyChange {
  export const detected = (
    previous: readonly unknown[] | null,
    current: readonly unknown[],
  ): boolean => previous == null
    || previous.length !== current.length
    || previous.some((value, index) => !Object.is(value, current[index]))
}

export default EffectDependencyChange
