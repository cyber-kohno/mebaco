import type Style from '@system/model/view/style/style'

namespace StyleKeyframes {
  export type Kind = 'style-keyframes'

  export type Selector = {
    type: 'offset'
    value: number
  }

  export type Frame = {
    frameId: string
    selectors: Selector[]
    declarations: Style.DeclarationRule[]
  }

  export type Element = {
    kind: Kind
    keyframesId: string
    id: string
    frames: Frame[]
  }

  export const createFrame = (
    offset: number,
    frameId: string = crypto.randomUUID(),
  ): Frame => ({
    frameId,
    selectors: [{ type: 'offset', value: offset }],
    declarations: [],
  })

  export const createInitialFrames = (): Frame[] => [
    createFrame(0),
    createFrame(100),
  ]

  export const create = (
    id: string,
    frames: Frame[] = createInitialFrames(),
    keyframesId: string = crypto.randomUUID(),
  ): Element => ({
    kind: 'style-keyframes',
    keyframesId,
    id,
    frames,
  })

  const parseStyleValue = (
    value: unknown,
  ): Style.StyleValue | null => {
    if (value == null || typeof value !== 'object') return null
    const candidate = value as { type?: unknown; value?: unknown; source?: unknown }
    if (candidate.type === 'literal' && typeof candidate.value === 'string') {
      return { type: 'literal', value: candidate.value }
    }
    if (candidate.type === 'formula' && typeof candidate.source === 'string') {
      return { type: 'formula', source: candidate.source }
    }
    return null
  }

  const parseDeclaration = (
    value: unknown,
  ): Style.DeclarationRule | null => {
    if (value == null || typeof value !== 'object') return null
    const candidate = value as { type?: unknown; property?: unknown; value?: unknown }
    const styleValue = parseStyleValue(candidate.value)
    return candidate.type === 'declaration'
      && typeof candidate.property === 'string'
      && styleValue != null
      ? { type: 'declaration', property: candidate.property, value: styleValue }
      : null
  }

  const parseSelector = (
    value: unknown,
  ): Selector | null => {
    if (value == null || typeof value !== 'object') return null
    const candidate = value as { type?: unknown; value?: unknown }
    return candidate.type === 'offset'
      && typeof candidate.value === 'number'
      && Number.isFinite(candidate.value)
      && candidate.value >= 0
      && candidate.value <= 100
      ? { type: 'offset', value: candidate.value }
      : null
  }

  const parseFrame = (
    value: unknown,
  ): Frame | null => {
    if (value == null || typeof value !== 'object') return null
    const candidate = value as {
      frameId?: unknown
      selectors?: unknown
      declarations?: unknown
    }
    if (
      typeof candidate.frameId !== 'string'
      || candidate.frameId.length === 0
      || !Array.isArray(candidate.selectors)
      || !Array.isArray(candidate.declarations)
    ) return null

    const selectors = candidate.selectors
      .map(parseSelector)
      .filter((selector): selector is Selector => selector != null)
    const declarations = candidate.declarations
      .map(parseDeclaration)
      .filter((declaration): declaration is Style.DeclarationRule => declaration != null)
    return selectors.length === 0
      ? null
      : { frameId: candidate.frameId, selectors, declarations }
  }

  export const parseFrames = (
    source: string,
  ): Frame[] => {
    try {
      const parsed: unknown = JSON.parse(source)
      return Array.isArray(parsed)
        ? parsed.map(parseFrame).filter((frame): frame is Frame => frame != null)
        : []
    } catch {
      return []
    }
  }
}

export default StyleKeyframes
