import type ElementDefinition from '../../../element-definition'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import ValueSource from '../../../../ui/input/value-source'
import TypeCatalog from '../../type/type-catalog'
import TypeExpression from '../../type/type-expression'
import TypedDefaultValueSchema from '../../shared/typed-default-value-schema'
import ValuePropTreeLabel from './ValuePropTreeLabel.svelte'
import TreeStore from '../../../../store/tree-store'

namespace ValuePropElement {
  export type Kind = 'value-prop'

  export type Element = {
    kind: Kind
    propId: string
    id: string
    valueType: TypeExpression.Expression
    nullable: boolean
    defaultValue?: ValueSource.Value
  }

  export const create = (
    id: string,
    valueType: TypeExpression.Expression = TypeExpression.createPrimitive(),
    nullable = false,
    defaultValue?: ValueSource.Value,
    propId: string = crypto.randomUUID(),
  ): Element => ({
    kind: 'value-prop',
    propId,
    id,
    valueType,
    nullable,
    defaultValue,
  })

  export type CreateSchemaOptions = TypedDefaultValueSchema.Options

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ) => TypedDefaultValueSchema.create<Element>({
    createTitle: 'Create Value Prop',
    updateTitle: 'Update Value Prop',
    createPreview: () => create('...'),
    createElement: (values) => create(
      values.id,
      values.valueType,
      values.nullable,
      values.defaultValue,
    ),
  }, options)

  export const definition = {
    kind: 'value-prop',
    treeLabel: {
      type: 'component',
      Component: ValuePropTreeLabel,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = (context.parentNode?.children ?? [])
        .filter((node) => node.id !== context.node.id)
        .map((node) => node.element)
        .filter((element): element is Element => element.kind === 'value-prop')
        .map((element) => element.id)
      const referenceOptions = TypeCatalog.getReferenceOptions(
        context.rootNode,
        context.node.id,
      )
      const namedTypeOptions = TypeCatalog.getNamedTypeOptions(
        context.rootNode,
        context.node.id,
      )

      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema({ reservedNames, referenceOptions, namedTypeOptions }),
          )
        }),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default ValuePropElement
