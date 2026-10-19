import HtmlTag from '@system/model/element/html-tag'
import type ResolvableValue from '@system/model/value/resolvable-value'
import type Style from '@system/model/view/style/style'

namespace Tag {
  export type Kind = 'tag'
  export type TagName = HtmlTag.TagName

  export type Element = {
    kind: Kind
    tagName: TagName
    comment: string
    refKey?: RefKey
    partialKey?: PartialKey
    styles: StyleApplication[]
    attributes: Attribute[]
  }

  export type RefKey = ResolvableValue.Value<string>
  export type PartialKey = RefKey
  export type StyleArgumentBinding = Exclude<
    Style.ArgumentBinding,
    { type: 'delegate' }
  >

  export type StyleApplication = {
    referenceId: string
    styleId: string
    condition?: Style.FormulaSource
    arguments: StyleArgument[]
  }

  export type StyleArgument = {
    parameterId: string
    binding: StyleArgumentBinding
  }

  export type Attribute = HtmlAttribute | EventHandler

  export type HtmlAttribute = {
    type: 'attribute'
    name: string
    value: AttributeValue
  }

  export type EventHandler = {
    type: 'event'
    name: string
    preventDefault: boolean
    stopPropagation: boolean
    action: EventAction
  }

  export type AttributeValue = ResolvableValue.Value<string | number | boolean>

  export type EventAction = {
    type: 'script'
    source: string
  }

  export const create = (
    tagName: TagName,
    comment: string,
    styles: StyleApplication[] = [],
    attributes: Attribute[] = [],
    refKey?: RefKey,
    partialKey?: PartialKey,
  ): Element => ({
    kind: 'tag',
    tagName,
    comment,
    ...(refKey == null ? {} : { refKey }),
    ...(partialKey == null ? {} : { partialKey }),
    styles,
    attributes,
  })

  export const parseRefKey = (
    source: string,
  ): RefKey | undefined => {
    if (source.length === 0) return undefined
    try {
      const parsed = JSON.parse(source) as Partial<RefKey> | null
      if (parsed == null || typeof parsed !== 'object') return undefined
      if (parsed.type === 'literal' && typeof parsed.value === 'string') {
        return { type: 'literal', value: parsed.value }
      }
      if (parsed.type === 'formula' && typeof parsed.source === 'string') {
        return { type: 'formula', source: parsed.source }
      }
    } catch {
      return undefined
    }
    return undefined
  }

  export const parsePartialKey = (
    source: string,
  ): PartialKey | undefined => parseRefKey(source)
}

export default Tag
