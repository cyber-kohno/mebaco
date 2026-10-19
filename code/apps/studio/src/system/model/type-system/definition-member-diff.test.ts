import { describe, expect, it } from 'vitest'
import DefinitionMemberDiff from './definition-member-diff'

type Member = {
  stableId: string
  name: string
}

const member = (stableId: string, name = stableId): Member => ({ stableId, name })

describe('DefinitionMemberDiff', () => {
  it('classifies add, remove, update, and reorder by stable ID', () => {
    const previous = [member('a', 'first'), member('b', 'second'), member('removed')]
    const current = [member('b', 'renamed'), member('a', 'first'), member('added')]

    const result = DefinitionMemberDiff.compare(previous, current, (item) => item.stableId)

    expect(result.added).toEqual([{ member: member('added'), index: 2 }])
    expect(result.removed).toEqual([{ member: member('removed'), index: 2 }])
    expect(result.updated.map((entry) => entry.memberId)).toEqual(['b'])
    expect(result.reordered.map((entry) => entry.memberId)).toEqual(['a', 'b'])
  })

  it.each([
    [[member('', 'empty')], [], 'Definition member ID is empty in the previous definition.'],
    [[member('same'), member('same')], [], "Definition member ID 'same' is duplicated in the previous definition."],
    [[], [member('same'), member('same')], "Definition member ID 'same' is duplicated in the current definition."],
  ] as const)('rejects malformed stable identities', (previous, current, message) => {
    expect(() => DefinitionMemberDiff.compare(previous, current, (item) => item.stableId))
      .toThrow(message)
  })
})
