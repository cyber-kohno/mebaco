namespace DefinitionMemberDiff {
  export type Indexed<T> = {
    member: T
    index: number
  }

  export type Matched<T> = {
    memberId: string
    previous: T
    current: T
    previousIndex: number
    currentIndex: number
  }

  export type Result<T> = {
    added: Indexed<T>[]
    removed: Indexed<T>[]
    updated: Matched<T>[]
    reordered: Matched<T>[]
  }

  const indexById = <T>(
    members: readonly T[],
    getMemberId: (member: T) => string,
    side: 'previous' | 'current',
  ): Map<string, Indexed<T>> => {
    const result = new Map<string, Indexed<T>>()
    members.forEach((member, index) => {
      const memberId = getMemberId(member)
      if (memberId.length === 0) {
        throw new Error(`Definition member ID is empty in the ${side} definition.`)
      }
      if (result.has(memberId)) {
        throw new Error(`Definition member ID '${memberId}' is duplicated in the ${side} definition.`)
      }
      result.set(memberId, { member, index })
    })
    return result
  }

  export const compare = <T>(
    previous: readonly T[],
    current: readonly T[],
    getMemberId: (member: T) => string,
    getFingerprint: (member: T) => string = (member) => JSON.stringify(member),
  ): Result<T> => {
    const previousById = indexById(previous, getMemberId, 'previous')
    const currentById = indexById(current, getMemberId, 'current')

    const added = current.flatMap((member, index) => (
      previousById.has(getMemberId(member)) ? [] : [{ member, index }]
    ))
    const removed = previous.flatMap((member, index) => (
      currentById.has(getMemberId(member)) ? [] : [{ member, index }]
    ))
    const matched = previous.flatMap((previousMember, previousIndex): Matched<T>[] => {
      const memberId = getMemberId(previousMember)
      const currentMatch = currentById.get(memberId)
      return currentMatch == null
        ? []
        : [{
            memberId,
            previous: previousMember,
            current: currentMatch.member,
            previousIndex,
            currentIndex: currentMatch.index,
          }]
    })

    return {
      added,
      removed,
      updated: matched.filter(({ previous: before, current: after }) => (
        getFingerprint(before) !== getFingerprint(after)
      )),
      reordered: matched.filter(({ previousIndex, currentIndex }) => previousIndex !== currentIndex),
    }
  }
}

export default DefinitionMemberDiff
