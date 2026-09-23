namespace LiteralUnion {
  export const maxTextLength = 24

  export const validateTextLength = (
    value: string,
  ): string | null => (
    value.length <= maxTextLength
      ? null
      : `Literal must be ${maxTextLength} characters or fewer.`
  )

  export const validateTextDraft = (
    value: string,
    existingValues: readonly string[],
  ): string | null => {
    if (value.length === 0) return 'Literal must be 1 character or more.'
    const lengthError = validateTextLength(value)
    if (lengthError != null) return lengthError
    if (existingValues.includes(value)) return 'Literal is duplicated.'
    return null
  }
}

export default LiteralUnion
