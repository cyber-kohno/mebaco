import SuggestTextOptions from '../../../../ui/input/suggest-text-options'

namespace StyleReferenceOptions {
  export type Option = {
    value: string
    label?: string
    category?: string
  }

  export const getMatches = <T extends Option>(
    options: readonly T[],
    categoryQuery: string,
    idQuery: string,
  ): T[] => {
    const category = categoryQuery.toLowerCase()
    const id = idQuery.toLowerCase()
    return options
      .map((option, index) => ({
        option,
        index,
        categoryRank: SuggestTextOptions.getMatchRank(
          (option.category ?? '').toLowerCase(),
          category,
        ),
        idRank: SuggestTextOptions.getMatchRank(
          (option.label ?? option.value).toLowerCase(),
          id,
        ),
      }))
      .filter((item) => item.categoryRank != null && item.idRank != null)
      .sort((left, right) => (
        (left.categoryRank! + left.idRank!) - (right.categoryRank! + right.idRank!)
        || left.categoryRank! - right.categoryRank!
        || left.idRank! - right.idRank!
        || left.index - right.index
      ))
      .map((item) => item.option)
  }
}

export default StyleReferenceOptions
