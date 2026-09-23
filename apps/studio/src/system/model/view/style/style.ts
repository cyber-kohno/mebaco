import type TreeNode from '@system/model/tree/tree-node'
import type ResolvableValue from '@system/model/value/resolvable-value'

namespace Style {
  export type Kind = 'style'

  export type Element = {
    kind: Kind
    styleId: string
    id: string
    category?: string
    rules: Rule[]
    animations?: AnimationRule[]
    bases: Base[]
  }

  export type FormulaSource = ResolvableValue.Formula
  export type ParameterValue = ResolvableValue.Value<string | number | boolean>

  export type ArgumentBinding =
    | { type: 'default' }
    | { type: 'delegate' }
    | { type: 'value'; value: ParameterValue }

  export type Argument = {
    parameterId: string
    binding: ArgumentBinding
  }

  export type Base = {
    referenceId: string
    styleId: string
    condition?: FormulaSource
    arguments: Argument[]
  }

  export const states = [
    'hover',
    'focus',
    'focus-visible',
    'checked',
    'active',
    'disabled',
  ] as const

  export type State = (typeof states)[number]
  export type Rule = DeclarationRule | StateRule
  export type StyleValue = ResolvableValue.Value<string>

  export type DeclarationRule = {
    type: 'declaration'
    property: string
    value: StyleValue
  }

  export type StateRule = {
    type: 'state'
    state: State
    declarations: DeclarationRule[]
  }

  export type AnimationItem = {
    referenceId: string
    keyframesId: string
    duration: StyleValue
    timingFunction: StyleValue
    delay: StyleValue
    iterationCount: StyleValue
    direction: StyleValue
    fillMode: StyleValue
    playState: StyleValue
    composition: StyleValue
    timeline: StyleValue
    rangeStart: StyleValue
    rangeEnd: StyleValue
  }

  export type AnimationRule = {
    type: 'animation'
    state?: State
    mode: 'none' | 'custom'
    items: AnimationItem[]
  }

  const literal = (value: string): StyleValue => ({ type: 'literal', value })

  export const createAnimation = (): AnimationItem => ({
    referenceId: crypto.randomUUID(),
    keyframesId: '',
    duration: literal('1s'),
    timingFunction: literal('ease'),
    delay: literal('0s'),
    iterationCount: literal('1'),
    direction: literal('normal'),
    fillMode: literal('none'),
    playState: literal('running'),
    composition: literal('replace'),
    timeline: literal('auto'),
    rangeStart: literal('normal'),
    rangeEnd: literal('normal'),
  })

  export const create = (
    id: string,
    rules: Rule[] = [],
    bases: Base[] = [],
    styleId: string = crypto.randomUUID(),
    animations: AnimationRule[] = [],
  ): Element => ({
    kind: 'style',
    styleId,
    id,
    rules,
    animations,
    bases,
  })

  export const createBase = (): Base => ({
    referenceId: crypto.randomUUID(),
    styleId: '',
    arguments: [],
  })

  export const getContainerInsertIndex = (
    node: TreeNode.Node,
    kind: 'style-params' | 'style-locals',
  ): number => {
    if (kind === 'style-params') return 0
    const parametersIndex = node.children.findIndex(
      (child) => child.element.kind === 'style-params',
    )
    return parametersIndex < 0 ? 0 : parametersIndex + 1
  }

  const parseFormulaSource = (
    value: unknown,
  ): FormulaSource | null => {
    if (value == null || typeof value !== 'object') return null
    const formula = value as Partial<FormulaSource>
    return formula.type === 'formula' && typeof formula.source === 'string'
      ? { type: 'formula', source: formula.source }
      : null
  }

  const parseParameterValue = (
    value: unknown,
  ): ParameterValue | null => {
    const formula = parseFormulaSource(value)
    if (formula != null) return formula
    if (value == null || typeof value !== 'object') return null
    const candidate = value as Partial<ParameterValue>
    return candidate.type === 'literal'
      && ['string', 'number', 'boolean'].includes(typeof candidate.value)
      ? {
          type: 'literal',
          value: candidate.value as string | number | boolean,
        }
      : null
  }

  const parseArgumentBinding = (
    value: unknown,
  ): ArgumentBinding | null => {
    if (value == null || typeof value !== 'object') return null
    const candidate = value as Partial<ArgumentBinding>
    if (candidate.type === 'default') return { type: 'default' }
    if (candidate.type === 'delegate') return { type: 'delegate' }
    if (candidate.type === 'value') {
      const parameterValue = parseParameterValue(candidate.value)
      return parameterValue == null
        ? null
        : { type: 'value', value: parameterValue }
    }
    return null
  }

  const parseArgument = (
    item: unknown,
  ): Argument | null => {
    if (item == null || typeof item !== 'object') return null
    const argument = item as Partial<Argument>
    if (typeof argument.parameterId !== 'string') return null
    const binding = parseArgumentBinding(argument.binding)
    return binding == null
      ? null
      : { parameterId: argument.parameterId, binding }
  }

  const parseBase = (
    item: unknown,
  ): Base | null => {
    if (item == null || typeof item !== 'object') return null
    const base = item as Partial<Base>
    if (
      typeof base.referenceId !== 'string'
      || typeof base.styleId !== 'string'
      || !Array.isArray(base.arguments)
    ) return null
    const condition = parseFormulaSource(base.condition)
    if (base.condition != null && condition == null) return null
    return {
      referenceId: base.referenceId,
      styleId: base.styleId,
      condition: condition ?? undefined,
      arguments: base.arguments
        .map(parseArgument)
        .filter((argument): argument is Argument => argument != null),
    }
  }

  export const parseBases = (
    source: string,
  ): Base[] => {
    try {
      const parsed = JSON.parse(source)
      return Array.isArray(parsed)
        ? parsed.map(parseBase).filter((base): base is Base => base != null)
        : []
    } catch {
      return []
    }
  }

  export const parseStyleValue = (
    value: unknown,
  ): StyleValue | null => {
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
    item: unknown,
  ): DeclarationRule | null => {
    if (item == null || typeof item !== 'object') return null
    const declaration = item as Partial<DeclarationRule>
    const value = parseStyleValue(declaration.value)
    return declaration.type === 'declaration'
      && typeof declaration.property === 'string'
      && value != null
      ? { type: 'declaration', property: declaration.property, value }
      : null
  }

  const parseRule = (item: unknown): Rule | null => {
    if (item == null || typeof item !== 'object') return null
    const rule = item as Partial<DeclarationRule> & Partial<StateRule>
    const value = parseStyleValue(rule.value)
    if (
      rule.type === 'declaration'
      && typeof rule.property === 'string'
      && value != null
    ) {
      return { type: 'declaration', property: rule.property, value }
    }
    if (
      rule.type === 'state'
      && typeof rule.state === 'string'
      && states.includes(rule.state as State)
      && Array.isArray(rule.declarations)
    ) {
      return {
        type: 'state',
        state: rule.state as State,
        declarations: rule.declarations
          .map(parseDeclaration)
          .filter((child): child is DeclarationRule => child != null),
      }
    }
    return null
  }

  export const parseRules = (source: string): Rule[] => {
    try {
      const parsed = JSON.parse(source)
      return Array.isArray(parsed)
        ? parsed.map(parseRule).filter((item): item is Rule => item != null)
        : []
    } catch {
      return []
    }
  }

  const parseAnimationItem = (value: unknown): AnimationItem | null => {
    if (value == null || typeof value !== 'object') return null
    const item = value as Partial<Record<keyof AnimationItem, unknown>>
    if (typeof item.referenceId !== 'string' || typeof item.keyframesId !== 'string') {
      return null
    }
    const fields = [
      'duration', 'timingFunction', 'delay', 'iterationCount', 'direction',
      'fillMode', 'playState', 'composition', 'timeline', 'rangeStart', 'rangeEnd',
    ] as const
    const parsed = Object.fromEntries(fields.map((field) => [
      field,
      parseStyleValue(item[field]),
    ])) as Record<(typeof fields)[number], StyleValue | null>
    if (fields.some((field) => parsed[field] == null)) return null
    return {
      referenceId: item.referenceId,
      keyframesId: item.keyframesId,
      duration: parsed.duration!,
      timingFunction: parsed.timingFunction!,
      delay: parsed.delay!,
      iterationCount: parsed.iterationCount!,
      direction: parsed.direction!,
      fillMode: parsed.fillMode!,
      playState: parsed.playState!,
      composition: parsed.composition!,
      timeline: parsed.timeline!,
      rangeStart: parsed.rangeStart!,
      rangeEnd: parsed.rangeEnd!,
    }
  }

  export const parseAnimations = (source: string): AnimationRule[] => {
    try {
      const parsed: unknown = JSON.parse(source)
      if (!Array.isArray(parsed)) return []
      return parsed.flatMap((value): AnimationRule[] => {
        if (value == null || typeof value !== 'object') return []
        const rule = value as {
          type?: unknown
          state?: unknown
          mode?: unknown
          items?: unknown
        }
        if (
          rule.type !== 'animation'
          || (rule.state != null && !states.includes(rule.state as State))
          || (rule.mode !== 'none' && rule.mode !== 'custom')
          || !Array.isArray(rule.items)
        ) return []
        const items = rule.items
          .map(parseAnimationItem)
          .filter((item): item is AnimationItem => item != null)
        return items.length === rule.items.length
          ? [{
              type: 'animation',
              state: typeof rule.state === 'string' ? rule.state as State : undefined,
              mode: rule.mode,
              items,
            }]
          : []
      })
    } catch {
      return []
    }
  }
}

export default Style
