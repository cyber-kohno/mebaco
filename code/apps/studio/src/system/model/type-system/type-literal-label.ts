namespace TypeLiteralLabel {
  const escapeCharacter = (
    character: string,
  ): string => {
    switch (character) {
      case '\\': return '\\\\'
      case "'": return "\\'"
      case '\b': return '\\b'
      case '\f': return '\\f'
      case '\n': return '\\n'
      case '\r': return '\\r'
      case '\t': return '\\t'
      case '\v': return '\\v'
    }

    const codePoint = character.codePointAt(0)
    return codePoint != null && (codePoint < 0x20 || codePoint === 0x7f)
      ? `\\u${codePoint.toString(16).padStart(4, '0')}`
      : character
  }

  export const format = (
    value: string | number,
  ): string => typeof value === 'string'
    ? `'${[...value].map(escapeCharacter).join('')}'`
    : String(value)
}

export default TypeLiteralLabel
