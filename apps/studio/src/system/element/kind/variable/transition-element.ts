import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import TreeStore from '../../../store/tree-store'
import type TreeNode from '../../../tree/tree-node'
import ComponentReference from '../component/shared/component-reference'
import LauncherElement from '../project/launcher-element'
import TransitionTreeLabel from './TransitionTreeLabel.svelte'
import TransitionImportCatalog from '../app/import/transition-import-catalog'

namespace TransitionElement {
  export type Kind = 'transition'
  export type Element = {
    kind: Kind
    appId: string | null
    argumentBindings: ComponentReference.Binding[]
  }

  export const create = (): Element => ({
    kind: 'transition',
    appId: null,
    argumentBindings: [],
  })

  export const createSchema = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): ElementEditSchema.Schema<Element> => {
    const ownerApp = TransitionImportCatalog.findOwnerApp(rootNode, targetNodeId)
    const options = ownerApp == null
      ? []
      : TransitionImportCatalog.getImportedApps(rootNode, ownerApp)
          .map(LauncherElement.getAppOption)
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
      createPreview: create,
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
  } satisfies ElementDefinition.Definition<Element>
}

export default TransitionElement
