import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import TreeStore from '@system/workspace/tree/state'
import type TreeNode from '@system/model/tree/tree-node'
import ComponentReference from '@system/model/component/component-reference'
import Launcher from '@system/model/project/launcher'
import TransitionTreeLabel from '@system/workspace/tree/label/variable/TransitionTreeLabel.svelte'
import TransitionImportCatalog from '@system/model/app/import/transition-import-catalog'
import Transition from '@system/model/variable/transition'

namespace TransitionElementDefinition {
  export const createSchema = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): ElementEditSchema.Schema<Transition.Element> => {
    const ownerApp = TransitionImportCatalog.findOwnerApp(rootNode, targetNodeId)
    const options = ownerApp == null
      ? []
      : TransitionImportCatalog.getImportedApps(rootNode, ownerApp)
          .map(Launcher.getAppOption)
          .filter((option): option is ComponentReference.Option => option != null)
    const parse = (values: Readonly<Record<string, string>>): ComponentReference.Binding[] => (
      ComponentReference.normalizeBindings(
        ComponentReference.parseBindings(values.argumentBindings) ?? [],
        options.find((option) => option.componentId === values.appId),
      )
    )
    return {
      createTitle: 'Create Transition',
      updateTitle: 'Update Transition',
      fields: [
        {
          type: 'select',
          key: 'appId',
          label: 'App',
          width: 'id',
          required: true,
          options: options.map((option) => ({ value: option.componentId, label: option.label })),
          clearWhenChanged: ['argumentBindings'],
        },
        {
          type: 'componentBindings',
          key: 'argumentBindings',
          label: 'Arguments',
          defaultValue: '[]',
          required: true,
          componentIdKey: 'appId',
          components: options,
        },
      ],
      createPreview: Transition.create,
      getInitialValues: (element) => ({
        appId: element.appId ?? '',
        argumentBindings: ComponentReference.stringifyBindings(element.argumentBindings),
      }),
      create: (values) => ({
        kind: 'transition',
        appId: values.appId || null,
        argumentBindings: parse(values),
      }),
      update: (element, values) => ({
        ...element,
        appId: values.appId || null,
        argumentBindings: parse(values),
      }),
    }
  }

  export const definition = {
    kind: 'transition',
    treeLabel: {
      type: 'component',
      Component: TransitionTreeLabel,
    },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      return [
        action('Modify', () => {
          ElementDialog.openUpdate(
            context.node.id,
            context.element,
            createSchema(context.rootNode, context.node.id),
          )
        }),
        action(
          'Delete',
          () => TreeStore.removeNode(context.node.id),
          'danger',
        ),
      ]
    },
    childSlots: [],
    canDisable: true,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Transition.Element>
}

export default TransitionElementDefinition
