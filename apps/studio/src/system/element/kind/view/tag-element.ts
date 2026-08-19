import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import type MebacoElement from '../../element'
import type TreeNode from '../../../tree/tree-node'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ContentActions from '../../content-actions'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TagCatalog from './tag-catalog'
import TagTreeLabel from './TagTreeLabel.svelte'
import TreeStore from '../../../store/tree-store'
import type StyleElement from './style-element'
import StyleResolver from './style-resolver'

namespace TagElement {
  export type Kind = 'tag'

  export type TagName = TagCatalog.TagName

  export type Element = {
    kind: Kind
    tagName: TagName
    comment: string
    refKey?: RefKey
    styles: StyleApplication[]
    attributes: Attribute[]
  }

  export type RefKey =
    | {
      type: 'literal'
      value: string
    }
    | {
      type: 'formula'
      source: string
    }

  export type StyleArgumentBinding = Exclude<
    StyleElement.ArgumentBinding,
    { type: 'delegate' }
  >

  export type StyleApplication = {
    referenceId: string
    styleId: string
    condition?: StyleElement.FormulaSource
    arguments: StyleArgument[]
  }

  export type StyleArgument = {
    parameterId: string
    binding: StyleArgumentBinding
  }

  export type Attribute =
    | HtmlAttribute
    | DomProperty
    | EventHandler

  export type HtmlAttribute = {
    type: 'attribute'
    name: string
    value: AttributeValue
  }

  export type DomProperty = {
    type: 'property'
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

  export type AttributeValue =
    | {
      type: 'empty'
    }
    | {
      type: 'literal'
      value: string
    }
    | {
      type: 'formula'
      source: string
    }
    | {
      type: 'boolean'
      value: boolean
    }

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
  ): Element => ({
    kind: 'tag',
    tagName,
    comment,
    ...(refKey == null ? {} : { refKey }),
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
      // Invalid editor values are handled by schema validation.
    }
    return undefined
  }

  const parseTagName = (value: string): TagName => {
    if (TagCatalog.isTagName(value)) return value
    return 'div'
  }

  export type CreateSchemaOptions = {
    styleOptions?: readonly ElementEditSchema.SelectOption[]
    styleCatalog?: StyleResolver.Catalog
  }

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Tag',
    updateTitle: 'Update Tag',
    tabs: [
      { id: 'info', label: 'Info' },
      { id: 'style', label: 'Style' },
      { id: 'monitor', label: 'Monitor' },
      { id: 'attribute', label: 'Attribute' },
    ],
    fields: [
      {
        type: 'select',
        tab: 'info',
        key: 'tagName',
        label: 'Tag name',
        required: true,
        defaultValue: 'div',
        width: 'tagName',
        options: TagCatalog.options,
      },
      {
        type: 'text',
        tab: 'info',
        key: 'comment',
        label: 'Comment',
        charset: 'any',
        maxLength: 80,
      },
      {
        type: 'tagRefKey',
        tab: 'info',
        key: 'refKey',
        label: 'Ref',
        defaultValue: '',
      },
      {
        type: 'styleApplications',
        tab: 'style',
        key: 'styles',
        label: 'Styles',
        defaultValue: '[]',
        options: options.styleOptions ?? [],
        getResolution: options.styleCatalog == null
          ? undefined
          : (styleId) => options.styleCatalog?.resolve(styleId) ?? {
              parameters: [],
              issues: [],
            },
      },
      {
        type: 'tagStyleMonitor',
        tab: 'monitor',
        key: 'monitor',
        label: 'Resolved Style',
        stylesKey: 'styles',
      },
      {
        type: 'tagAttributes',
        tab: 'attribute',
        key: 'attributes',
        label: 'Attributes',
        defaultValue: '[]',
      },
    ],
    createPreview: () => create('div', '...'),
    getInitialValues: (element) => ({
      tagName: element.tagName,
      comment: element.comment,
      refKey: element.refKey == null ? '' : JSON.stringify(element.refKey),
      styles: JSON.stringify(element.styles),
      attributes: JSON.stringify(element.attributes ?? []),
    }),
    create: (values) => create(
      parseTagName(values.tagName),
      values.comment,
      parseStyleApplications(values.styles),
      parseAttributes(values.attributes),
      parseRefKey(values.refKey ?? ''),
    ),
    update: (element, values) => {
      const { refKey: _currentRefKey, ...base } = element
      const refKey = parseRefKey(values.refKey ?? '')
      return {
        ...base,
        tagName: parseTagName(values.tagName),
        comment: values.comment,
        ...(refKey == null ? {} : { refKey }),
        styles: parseStyleApplications(values.styles),
        attributes: parseAttributes(values.attributes),
      }
    },
  })

  const parseStyleApplications = (source: string): StyleApplication[] => {
    try {
      const parsed = JSON.parse(source)
      if (!Array.isArray(parsed)) return []

      return parsed
        .map(parseStyleApplication)
        .filter((item): item is StyleApplication => item != null)
    } catch {
      return []
    }
  }

  const parseStyleApplication = (item: unknown): StyleApplication | null => {
    if (item == null || typeof item !== 'object') return null

    const application = item as Partial<StyleApplication>
    if (
      typeof application.referenceId !== 'string'
      || typeof application.styleId !== 'string'
      || !Array.isArray(application.arguments)
    ) return null

    const condition = parseFormulaSource(application.condition)
    if (application.condition != null && condition == null) return null

    return {
      referenceId: application.referenceId,
      styleId: application.styleId,
      condition: condition ?? undefined,
      arguments: application.arguments
        .map(parseStyleArgument)
        .filter((argument): argument is StyleArgument => argument != null),
    }
  }

  const parseStyleArgument = (item: unknown): StyleArgument | null => {
    if (item == null || typeof item !== 'object') return null

    const argument = item as Partial<StyleArgument>
    if (typeof argument.parameterId !== 'string') return null

    const binding = parseStyleArgumentBinding(argument.binding)
    return binding == null
      ? null
      : { parameterId: argument.parameterId, binding }
  }

  const parseStyleArgumentBinding = (value: unknown): StyleArgumentBinding | null => {
    if (value == null || typeof value !== 'object') return null

    const candidate = value as {
      type?: unknown
      value?: unknown
    }
    if (candidate.type === 'default') return { type: 'default' }
    if (candidate.type === 'value') {
      const parameterValue = parseStyleParameterValue(candidate.value)
      return parameterValue == null
        ? null
        : { type: 'value', value: parameterValue }
    }
    return null
  }

  const parseStyleParameterValue = (value: unknown): StyleElement.ParameterValue | null => {
    const formula = parseFormulaSource(value)
    if (formula != null) return formula
    if (value == null || typeof value !== 'object') return null

    const candidate = value as { type?: unknown; value?: unknown }
    return candidate.type === 'literal'
      && ['string', 'number', 'boolean'].includes(typeof candidate.value)
      ? {
          type: 'literal',
          value: candidate.value as string | number | boolean,
        }
      : null
  }

  const parseFormulaSource = (value: unknown): StyleElement.FormulaSource | null => {
    if (value == null || typeof value !== 'object') return null

    const formula = value as Partial<StyleElement.FormulaSource>
    return formula.type === 'formula' && typeof formula.source === 'string'
      ? { type: 'formula', source: formula.source }
      : null
  }

  const parseAttributes = (source: string): Attribute[] => {
    try {
      const parsed = JSON.parse(source)
      if (!Array.isArray(parsed)) return []

      return parsed
        .map(parseAttribute)
        .filter((attribute): attribute is Attribute => attribute != null)
    } catch {
      return []
    }
  }

  const parseAttribute = (item: unknown): Attribute | null => {
    if (item == null || typeof item !== 'object') return null

    const attribute = item as Partial<Attribute>
    if (attribute.type === 'attribute' || attribute.type === 'property') {
      if (typeof attribute.name !== 'string' || !isAttributeValue(attribute.value)) return null
      return {
        type: attribute.type,
        name: attribute.name,
        value: attribute.value,
      }
    }

    if (attribute.type === 'event') {
      if (
        typeof attribute.name !== 'string'
        || attribute.action == null
        || attribute.action.type !== 'script'
        || typeof attribute.action.source !== 'string'
      ) return null

      return {
        type: 'event',
        name: attribute.name,
        preventDefault: attribute.preventDefault === true,
        stopPropagation: attribute.stopPropagation === true,
        action: {
          type: 'script',
          source: attribute.action.source,
        },
      }
    }

    return null
  }

  const isAttributeValue = (
    value: unknown,
  ): value is AttributeValue => {
    if (value == null || typeof value !== 'object') return false

    const attributeValue = value as Partial<AttributeValue>
    switch (attributeValue.type) {
      case 'empty':
        return true
      case 'literal':
        return typeof attributeValue.value === 'string'
      case 'formula':
        return typeof attributeValue.source === 'string'
      case 'boolean':
        return typeof attributeValue.value === 'boolean'
      default:
        return false
    }
  }

  const isStyleElement = (element: MebacoElement.Element): element is StyleElement.Element => (
    element.kind === 'style'
  )

  export const getStyleOptions = (
    rootNode: TreeNode.Node,
  ): ElementEditSchema.SelectOption[] => {
    const options: ElementEditSchema.SelectOption[] = []

    const collect = (node: TreeNode.Node) => {
      if (isStyleElement(node.element)) {
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

  export const definition = {
    kind: 'tag',
    treeLabel: {
      type: 'component',
      Component: TagTreeLabel,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const items: ActionMenuState.Item[] = [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({
              styleOptions: getStyleOptions(context.rootNode),
              styleCatalog: StyleResolver.createCatalog(context.rootNode),
            }),
          )
        }),
      ]

      if (TagCatalog.canHaveChildren(context.element.tagName)) {
        items.push(...ContentActions.createOptionalRetentionItems(
          context.node,
          context.rootNode,
        ))
      }

      items.push(action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'))
      return items
    },
    contentHost: {
      retention: 'optional',
    },
    childSlots: [],
    canDisable: true,
  } satisfies ElementDefinition.Definition<Element>
}

export default TagElement

