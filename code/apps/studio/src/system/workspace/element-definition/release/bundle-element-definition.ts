import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import type TreeNode from '@system/model/tree/tree-node'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import Bundle from '@system/model/release/bundle'
import BundleTreeLabel from '@system/workspace/tree/label/release/BundleTreeLabel.svelte'

namespace BundleElementDefinition {
  const launcherOptions = (rootNode: TreeNode.Node): ElementEditSchema.SelectOption[] => {
    const result: ElementEditSchema.SelectOption[] = []
    const visit = (node: TreeNode.Node) => {
      if (node.element.kind === 'launcher') {
        result.push({
          value: node.element.launcherId,
          label: node.element.name?.trim() || node.element.id,
          detail: node.element.name?.trim() ? node.element.id : undefined,
        })
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return result
  }

  const parseLauncherIds = (source: string): string[] => {
    try {
      const parsed: unknown = JSON.parse(source)
      return Array.isArray(parsed)
        ? [...new Set(parsed.filter((value): value is string => (
            typeof value === 'string' && value.length > 0
          )))]
        : []
    } catch {
      return []
    }
  }

  export const createSchema = (
    rootNode: TreeNode.Node,
    reservedNames: readonly string[] = [],
  ): ElementEditSchema.Schema<Bundle.Element> => ({
    createTitle: 'Create Bundle',
    updateTitle: 'Update Bundle',
    tabs: [
      { id: 'targets', label: 'Targets' },
      { id: 'revision', label: 'Revision' },
    ],
    fields: [
      {
        type: 'text', tab: 'targets', key: 'id', label: 'Id', width: 'id', required: true,
        charset: 'identifier', minLength: 1, maxLength: 32, reservedNames,
      },
      {
        type: 'bundleDefinition', tab: 'targets', key: 'launcherIds', label: 'Launchers',
        defaultValue: '[]', options: launcherOptions(rootNode),
      },
      {
        type: 'number', tab: 'revision', key: 'generation', label: 'Generation', readOnly: true,
      },
      {
        type: 'text', tab: 'revision', key: 'contentHash', label: 'Content hash', readOnly: true,
      },
      {
        type: 'text', tab: 'revision', key: 'builtAt', label: 'Built at', readOnly: true,
      },
    ],
    createPreview: () => Bundle.create('...'),
    getInitialValues: (element) => ({
      id: element.id,
      launcherIds: JSON.stringify(element.launcherIds),
      generation: element.revision == null ? '' : String(element.revision.generation),
      contentHash: element.revision?.contentHash ?? '',
      builtAt: element.revision?.builtAt ?? '',
    }),
    create: (values) => ({
      ...Bundle.create(values.id),
      launcherIds: parseLauncherIds(values.launcherIds),
    }),
    update: (element, values) => ({
      ...element,
      id: values.id,
      launcherIds: parseLauncherIds(values.launcherIds),
    }),
  })

  export const definition = {
    kind: 'bundle',
    treeLabel: {
      type: 'component',
      Component: BundleTreeLabel,
    },
    getHierarchyText: ({ element }) => element.id,
    search: { getIdText: (element: Bundle.Element) => element.id },
    getContextMenu: (context) => {
      const { action } = ActionMenuState.createFactory()
      const reservedNames = context.parentNode?.children.flatMap((child) => (
        child.id !== context.node.id && child.element.kind === 'bundle'
          ? [child.element.id]
          : []
      )) ?? []
      return [
        action('Modify', () => ElementDialog.openUpdate(
          context.node.id,
          context.element,
          createSchema(context.rootNode, reservedNames),
        )),
        action('Delete', () => import('@system/workspace/tree/state').then(
          ({ default: store }) => store.removeNode(context.node.id),
        ), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Bundle.Element>
}

export default BundleElementDefinition
