import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import StyleTreeLabel from './StyleTreeLabel.svelte'
import StyleParamsElement from './style-params-element'
import TreeStore from '../../../store/tree-store'
import type TreeNode from '../../../tree/tree-node'
import StyleResolver from './style-resolver'

namespace StyleElement {
  export type Kind = 'style'

  export type Element = {
    kind: Kind
    id: string
    rules: Rule[]
    bases: Base[]
  }

  export type FormulaSource = {
    type: 'formula'
    source: string
  }

  export type ParameterValue =
    | {
        type: 'literal'
        value: string | number | boolean
      }
    | FormulaSource

  export type ArgumentBinding =
    | {
        type: 'default'
      }
    | {
        type: 'delegate'
      }
    | {
        type: 'value'
        value: ParameterValue
      }

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

  export type StyleValue =
    | {
        type: 'literal'
        value: string
      }
    | FormulaSource

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

  export const create = (
    id: string,
    rules: Rule[] = [],
    bases: Base[] = [],
  ): Element => ({
    kind: 'style',
    id,
    rules,
    bases,
  })

  export const createBase = (): Base => ({
    referenceId: crypto.randomUUID(),
    styleId: '',
    arguments: [],
  })

  export type CreateSchemaOptions = {
    reservedNames?: readonly string[]
    styleOptions?: readonly ElementEditSchema.SelectOption[]
    styleCatalog?: StyleResolver.Catalog
    ownerStyleId?: string
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Style',
    updateTitle: 'Update Style',
    tabs: [
      { id: 'info', label: 'Info' },
      { id: 'properties', label: 'Properties' },
      { id: 'inheritance', label: 'Inheritance' },
      { id: 'monitor', label: 'Monitor' },
    ],
    fields: [
      {
        type: 'text',
        tab: 'info',
        key: 'id',
        label: 'Id',
        width: 'id',
        required: true,
        charset: 'identifier',
        minLength: 1,
        maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'styleProps',
        tab: 'properties',
        key: 'rules',
        label: 'Properties',
        defaultValue: '[]',
      },
      {
        type: 'styleBases',
        tab: 'inheritance',
        key: 'bases',
        label: 'Inherited Styles',
        defaultValue: '[]',
        options: options.styleOptions ?? [],
        getResolution: options.styleCatalog == null
          ? undefined
          : (styleId) => options.styleCatalog?.resolve(
              styleId,
              options.ownerStyleId == null ? [] : [options.ownerStyleId],
            ) ?? { parameters: [], issues: [] },
        ownerParameters: options.styleCatalog == null || options.ownerStyleId == null
          ? []
          : options.styleCatalog.getDirectParameters(options.ownerStyleId),
      },
      {
        type: 'styleMonitor',
        tab: 'monitor',
        key: 'monitor',
        label: 'Resolved Style',
        idKey: 'id',
        rulesKey: 'rules',
        basesKey: 'bases',
      },
    ],
    createPreview: () => create('...'),
    getInitialValues: (element) => ({
      id: element.id,
      rules: JSON.stringify(element.rules),
      bases: JSON.stringify(element.bases ?? []),
    }),
    create: (values) => create(
      values.id,
      parseRules(values.rules),
      parseBases(values.bases),
    ),
    update: (element, values) => ({
      ...element,
      id: values.id,
      rules: parseRules(values.rules),
      bases: parseBases(values.bases),
    }),
  })

  export const getStyleOptions = (
    rootNode: TreeNode.Node,
    excludedNodeId?: number,
  ): ElementEditSchema.SelectOption[] => {
    const options: ElementEditSchema.SelectOption[] = []

    const collect = (node: TreeNode.Node) => {
      if (node.id !== excludedNodeId && node.element.kind === 'style') {
        options.push({
          value: node.element.id,
          label: node.element.id,
        })
      }
      node.children.forEach(collect)
    }

    collect(rootNode)
    return options
  }

  export const parseBases = (
    source: string,
  ): Base[] => {
    try {
      const parsed = JSON.parse(source)
      if (!Array.isArray(parsed)) return []

      return parsed
        .map(parseBase)
        .filter((base): base is Base => base != null)
    } catch {
      return []
    }
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

  const parseArgument = (
    item: unknown,
  ): Argument | null => {
    if (item == null || typeof item !== 'object') return null

    const argument = item as Partial<Argument>
    if (typeof argument.parameterId !== 'string') return null

    const binding = parseArgumentBinding(argument.binding)
    if (binding == null) return null

    return {
      parameterId: argument.parameterId,
      binding,
    }
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

  const parseFormulaSource = (
    value: unknown,
  ): FormulaSource | null => {
    if (value == null || typeof value !== 'object') return null

    const formula = value as Partial<FormulaSource>
    return formula.type === 'formula' && typeof formula.source === 'string'
      ? { type: 'formula', source: formula.source }
      : null
  }

  export const parseRules = (source: string): Rule[] => {
    try {
      const parsed = JSON.parse(source)
      if (!Array.isArray(parsed)) return []

      return parsed
        .map(parseRule)
        .filter((item): item is Rule => item != null)
    } catch {
      return []
    }
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
      return {
        type: 'declaration',
        property: rule.property,
        value,
      }
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

  const parseDeclaration = (item: unknown): DeclarationRule | null => {
    if (item == null || typeof item !== 'object') return null
    const declaration = item as Partial<DeclarationRule>
    const value = parseStyleValue(declaration.value)
    return declaration.type === 'declaration'
      && typeof declaration.property === 'string'
      && value != null
      ? { type: 'declaration', property: declaration.property, value }
      : null
  }

  export const parseStyleValue = (
    value: unknown,
  ): StyleValue | null => {
    if (value == null || typeof value !== 'object') return null

    const candidate = value as {
      type?: unknown
      value?: unknown
      source?: unknown
    }
    if (candidate.type === 'literal' && typeof candidate.value === 'string') {
      return {
        type: 'literal',
        value: candidate.value,
      }
    }
    if (candidate.type === 'formula' && typeof candidate.source === 'string') {
      return {
        type: 'formula',
        source: candidate.source,
      }
    }

    return null
  }

  export const definition = {
    kind: 'style',
    treeLabel: {
      type: 'component',
      Component: StyleTreeLabel,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is Element => element.kind === 'style')
        .map((element) => element.id)

      const paramsNode = context.node.children.find((node) => (
        node.element.kind === 'style-params'
      ))
      const parameterAction = paramsNode == null
        ? action('Use parameters', () => {
            TreeStore.addChild(context.node.id, StyleParamsElement.create())
          })
        : action('Remove parameters', () => {
            TreeStore.removeNode(paramsNode.id)
          })

      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({
              reservedNames,
              styleOptions: getStyleOptions(context.rootNode, context.node.id),
              styleCatalog: StyleResolver.createCatalog(context.rootNode),
              ownerStyleId: context.element.id,
            }),
          )
        }),
        parameterAction,
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default StyleElement
