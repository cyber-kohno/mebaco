import type ElementDefinition from '../../../element-definition'
import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import type StyleElement from './style-element'

namespace StyleKeyframesElement {
  export type Kind = 'style-keyframes'

  export type Selector = {
    type: 'offset'
    value: number
  }

  export type Frame = {
    frameId: string
    selectors: Selector[]
    declarations: StyleElement.DeclarationRule[]
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
  ): StyleElement.StyleValue | null => {
    if (value == null || typeof value !== 'object') return null
    const candidate = value as {
      type?: unknown
      value?: unknown
      source?: unknown
    }
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
  ): StyleElement.DeclarationRule | null => {
    if (value == null || typeof value !== 'object') return null
    const candidate = value as {
      type?: unknown
      property?: unknown
      value?: unknown
    }
    const styleValue = parseStyleValue(candidate.value)
    return candidate.type === 'declaration'
      && typeof candidate.property === 'string'
      && styleValue != null
      ? {
          type: 'declaration',
          property: candidate.property,
          value: styleValue,
        }
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
      .filter((declaration): declaration is StyleElement.DeclarationRule => declaration != null)
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

  export const createSchema = (
    reservedNames: readonly string[] = [],
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Keyframes',
    updateTitle: 'Update Keyframes',
    fields: [
      {
        type: 'text', key: 'id', label: 'Id', width: 'id', required: true,
        charset: 'identifier', minLength: 1, maxLength: 32, reservedNames,
      },
      {
        type: 'styleKeyframes', key: 'frames', label: 'Frames',
        defaultValue: JSON.stringify(createInitialFrames()),
      },
    ],
    createPreview: () => create('...'),
    getInitialValues: (element) => ({
      id: element.id,
      frames: JSON.stringify(element.frames),
    }),
    create: (values) => create(values.id, parseFrames(values.frames)),
    update: (element, values) => ({
      ...element,
      id: values.id,
      frames: parseFrames(values.frames),
    }),
  })

  export const definition = {
    kind: 'style-keyframes',
    treeLabel: {
      type: 'static',
      kindText: 'Keyframes',
      tone: 'master',
      getValueText: (element: Element) => element.id,
    },
    getHierarchyText: ({ element }) => element.id,
    search: { getIdText: (element: Element) => element.id },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.parentNode?.children.flatMap((child) => (
        child.id !== context.node.id && child.element.kind === 'style-keyframes'
          ? [child.element.id]
          : []
      )) ?? []
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema(reservedNames),
        )),
        action('Delete', () => {
          void import('../../../deletion/element-deletion-controller').then(
            ({ default: controller }) => controller.requestDelete({
              rootNode: context.rootNode,
              node: context.node,
              policy: { label: 'Keyframes', structuralReferences: 'block' },
              deleteNode: () => import('../../../../store/tree-store').then(
                ({ default: store }) => store.removeNode(context.node.id),
              ),
            }),
          )
        }, 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default StyleKeyframesElement
