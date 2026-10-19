import ResolvableValue from '@system/model/value/resolvable-value'

namespace Component {
  export type Kind = 'component'
  export type PartialKey = ResolvableValue.Value<string>

  export type Element = {
    kind: Kind
    componentId: string
    id: string
    local?: boolean
    partialKey?: PartialKey
  }

  export const create = (
    id: string,
    componentId: string = crypto.randomUUID(),
    partialKey?: PartialKey,
  ): Element => ({
    kind: 'component',
    componentId,
    id,
    ...(partialKey == null ? {} : { partialKey }),
  })

  export const createLocal = (
    id: string,
    componentId: string = crypto.randomUUID(),
  ): Element => ({
    kind: 'component',
    componentId,
    id,
    local: true,
  })

  export const isLocal = (element: Element): boolean => element.local === true

  export const parsePartialKey = (
    source: string,
  ): PartialKey | undefined => (
    ResolvableValue.parseJson(source, (value): value is string => typeof value === 'string')
      ?? undefined
  )
}

export default Component
