import { describe, expect, it } from 'vitest'
import CodeMemberIdentifier from './code-member-identifier'

describe('CodeMemberIdentifier', () => {
  it.each(['value', 'userName', 'count2'])(
    'accepts %s',
    (value) => expect(CodeMemberIdentifier.validate(value)).toBeNull(),
  )

  it.each(['', 'Value', '1value', 'user-name'])(
    'rejects invalid identifier shape %s',
    (value) => expect(CodeMemberIdentifier.validate(value)).not.toBeNull(),
  )

  it.each(['class', 'return', 'await', 'arguments', 'eval'])(
    'rejects reserved binding name %s',
    (value) => expect(CodeMemberIdentifier.validate(value)).toContain('reserved'),
  )
})
