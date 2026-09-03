import type ElementDefinition from '../../../element-definition'
import ActionMenuState from '../../../../action-menu/action-menu-state'
import ElementDialog from '../../../../element-dialog/element-dialog-controller'
import TypeExpression from '../../type/type-expression'
import TypeCatalog from '../../type/type-catalog'
import TypedDefaultValueSchema from '../../shared/typed-default-value-schema'
import LaunchArgumentTreeLabel from './LaunchArgumentTreeLabel.svelte'
import TreeStore from '../../../../store/tree-store'
import ValueSource from '../../../../ui/input/value-source'

namespace LaunchArgumentElement {
  export type Kind = 'launch-argument'
  export type Element = {
    kind: Kind
    propId: string
    id: string
    valueType: TypeExpression.Expression
    nullable: boolean
    defaultValue?: ValueSource.Value
  }
  export const create = (
    id = '...',
    propId: string = crypto.randomUUID(),
  ): Element => ({
    kind: 'launch-argument',
    propId,
    id,
    valueType: TypeExpression.createPrimitive(),
    nullable: false,
  })

  export type CreateSchemaOptions = TypedDefaultValueSchema.Options

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ) => TypedDefaultValueSchema.create<Element>({
    createTitle: 'Create Launch Argument',
    updateTitle: 'Update Launch Argument',
    createPreview: () => create(),
    createElement: (values) => ({
      kind: 'launch-argument',
      propId: crypto.randomUUID(),
      ...values,
    }),
  }, options)
  export const definition = {
    kind: 'launch-argument',
    treeLabel: { type: 'component', Component: LaunchArgumentTreeLabel },
    search: { getIdText: (element) => element.id },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.parentNode?.children
        .filter((n) => n.id !== context.node.id)
        .map((n) => n.element)
        .filter((e): e is Element => e.kind === 'launch-argument')
        .map((e) => e.id) ?? []
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema({
            reservedNames,
            referenceOptions: TypeCatalog.getReferenceOptions(context.rootNode, context.node.id),
            namedTypeOptions: TypeCatalog.getCommonNamedTypeOptions(context.rootNode),
          }),
        )),
        action('Delete', () => TreeStore.removeNode(context.node.id), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}
export default LaunchArgumentElement
