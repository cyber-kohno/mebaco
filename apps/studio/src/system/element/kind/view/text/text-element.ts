import type ElementDefinition from '../../../element-definition'
import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import TextTreeLabel from './TextTreeLabel.svelte'
import ResolvableValue from '../../shared/resolvable-value'

namespace TextElement {
  export type Kind = 'text'

  export type Source = ResolvableValue.Value<string>

  export type Element = {
    kind: Kind
    source: Source
  }

  export const createLiteral = (
    value: string,
  ): Element => ({
    kind: 'text',
    source: ResolvableValue.createLiteral(value),
  })

  export const createFormula = (
    source: string,
  ): Element => ({
    kind: 'text',
    source: ResolvableValue.createFormula(source),
  })

  export const parseSource = (source: string): Source | null => (
    ResolvableValue.parseJson(source, (value): value is string => typeof value === 'string')
  )

  export const stringifySource = (source: Source): string => ResolvableValue.stringify(source)

  export const createSchema = (): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Text',
    updateTitle: 'Update Text',
    fields: [
      {
        type: 'textSource',
        key: 'source',
        label: 'Text',
        defaultValue: stringifySource(ResolvableValue.createLiteral('')),
        maxLiteralLength: 200,
        maxFormulaLength: 4000,
      },
    ],
    createPreview: () => createLiteral('...'),
    getInitialValues: (element) => ({
      source: stringifySource(element.source),
    }),
    create: (values) => ({
      kind: 'text',
      source: parseSource(values.source) ?? ResolvableValue.createLiteral(''),
    }),
    update: (element, values) => ({
      ...element,
      source: parseSource(values.source) ?? element.source,
    }),
  })

  export const definition = {
    kind: 'text',
    treeLabel: {
      type: 'component',
      Component: TextTreeLabel,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()

      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema(),
          )
        }),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default TextElement
