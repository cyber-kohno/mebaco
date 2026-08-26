import { describe, expect, it } from 'vitest'
import TypeLiteralLabel from './type-literal-label'

describe('TypeLiteralLabel', () => {
  it('formats string literals with single quotes', () => {
    expect(TypeLiteralLabel.format('standby')).toBe("'standby'")
  })

  it('escapes characters in single-quoted labels', () => {
    expect(TypeLiteralLabel.format("it's\\ready\n"))
      .toBe("'it\\'s\\\\ready\\n'")
    expect(TypeLiteralLabel.format('\u0000')).toBe("'\\u0000'")
  })

  it('formats number literals without quotes', () => {
    expect(TypeLiteralLabel.format(-1)).toBe('-1')
  })
})
