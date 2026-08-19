import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'
import TypeExpression from '../type/type-expression'
import TypeCatalog from '../type/type-catalog'
import ValueTypeDefinition from '../type/value-type-definition'

namespace FunctionArgumentElement {
  export type Kind = 'function-argument'

  export type Element = {
    kind: Kind
    id: string
    valueType: TypeExpression.Expression
    nullable: boolean
  }

  export const create = (
    id: string,
    valueType: TypeExpression.Expression = TypeExpression.createPrimitive(),
    nullable = false,
  ): Element => ({
    kind: 'function-argument',
    id,
    valueType,
    nullable,
  })

  export type SchemaOptions = {
    reservedNames?: readonly string[]
    referenceOptions?: readonly TypeCatalog.Option[]
    namedTypeOptions?: readonly TypeCatalog.Option[]
  }

  export const createSchema = (
    options: SchemaOptions = {},
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Argument',
    updateTitle: 'Update Argument',
    fields: [
      {
        type: 'text', key: 'id', label: 'Id', width: 'id', required: true,
        charset: 'jsIdentifier', minLength: 1, maxLength: 32,
        reservedNames: options.reservedNames,
      },
      {
        type: 'valueType', key: 'valueType', label: 'Value Type', required: true,
        defaultValue: ValueTypeDefinition.stringify(ValueTypeDefinition.create()),
        objectOptions: options.referenceOptions ?? [],
        namedTypeOptions: options.namedTypeOptions ?? [],
      },
    ],
    createPreview: () => create('...'),
    getInitialValues: (element) => ({
      id: element.id,
      valueType: ValueTypeDefinition.stringify({
        valueType: element.valueType,
        nullable: element.nullable,
      }),
    }),
    create: (values) => {
      const definition = ValueTypeDefinition.parse(values.valueType)
        ?? ValueTypeDefinition.create()
      return create(values.id, definition.valueType, definition.nullable)
    },
    update: (_element, values) => {
      const definition = ValueTypeDefinition.parse(values.valueType)
        ?? ValueTypeDefinition.create()
      return create(values.id, definition.valueType, definition.nullable)
    },
  })

  export const definition = {
    kind: 'function-argument',
    treeLabel: {
      type: 'static',
      kindText: 'Argument',
      tone: 'variable',
      getValueText: (element: Element) => element.id,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.parentNode?.children.flatMap((child) => (
        child.id !== context.node.id && child.element.kind === 'function-argument'
          ? [child.element.id]
          : []
      )) ?? []
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema({
            reservedNames,
            referenceOptions: TypeCatalog.getReferenceOptions(
              context.rootNode,
              context.node.id,
            ),
            namedTypeOptions: TypeCatalog.getNamedTypeOptions(
              context.rootNode,
              context.node.id,
            ),
          }),
        )),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
  } satisfies ElementDefinition.Definition<Element>
}

export default FunctionArgumentElement
