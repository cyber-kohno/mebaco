import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TypeCatalog from '@system/model/type-system/type-catalog'
import TypedDefaultValueSchema from '@system/workspace/element-definition/schema/typed-default-value-schema'
import LaunchArgumentTreeLabel from '@system/workspace/tree/label/app/LaunchArgumentTreeLabel.svelte'
import TreeStore from '@system/workspace/tree/state'
import LaunchArgument from '@system/model/app/launch-argument'

namespace LaunchArgumentElementDefinition {
  export type CreateSchemaOptions = TypedDefaultValueSchema.Options

  export const createSchema = (
    options: CreateSchemaOptions = {},
  ) => TypedDefaultValueSchema.create<LaunchArgument.Element>({
    createTitle: 'Create Launch Argument',
    updateTitle: 'Update Launch Argument',
    createPreview: () => LaunchArgument.create(),
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
        .filter((e): e is LaunchArgument.Element => e.kind === 'launch-argument')
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
  } satisfies ElementDefinition.Definition<LaunchArgument.Element>
}
export default LaunchArgumentElementDefinition
