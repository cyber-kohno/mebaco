import HtmlTag from '@system/model/element/html-tag'

namespace TagCatalog {
  export type Option = {
    value: string
    label?: string
    disabled?: boolean
    disabledReason?: string
  }

  export const options = HtmlTag.tagNames.map((tagName) => ({
    value: tagName,
  })) satisfies readonly Option[]

  export const getOptions = (
    disableVoidTags = false,
  ): readonly Option[] => HtmlTag.tagNames.map((tagName) => {
    const disabled = disableVoidTags && !HtmlTag.canHaveChildren(tagName)
    return {
      value: tagName,
      ...(disabled
        ? {
            label: `${tagName} — cannot contain children`,
            disabled: true,
            disabledReason: `${tagName} cannot be selected while this Tag has child elements.`,
          }
        : {}),
    }
  })

  export const getTone = (
    tagName: HtmlTag.TagName,
  ): 'container' | 'item' =>
    HtmlTag.canHaveChildren(tagName) ? 'container' : 'item'
}

export default TagCatalog
