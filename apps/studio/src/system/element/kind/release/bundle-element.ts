import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import type TreeNode from '../../../tree/tree-node'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'

namespace BundleElement {
  export type Kind = 'bundle'
  export type Element = {
    kind: Kind
    bundleId: string
    id: string
    launcherIds: string[]
  }

  export const create = (
    id: string,
    bundleId: string = crypto.randomUUID(),
  ): Element => ({ kind: 'bundle', bundleId, id, launcherIds: [] })

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
  ): ElementEditSchema.Schema<Element> => ({
    createTitle: 'Create Bundle',
    updateTitle: 'Update Bundle',
    fields: [
      {
        type: 'text', key: 'id', label: 'Id', width: 'id', required: true,
        charset: 'identifier', minLength: 1, maxLength: 32, reservedNames,
      },
      {
        type: 'bundleDefinition', key: 'launcherIds', label: 'Launchers',
        defaultValue: '[]', options: launcherOptions(rootNode),
      },
    ],
    createPreview: () => create('...'),
    getInitialValues: (element) => ({
      id: element.id,
      launcherIds: JSON.stringify(element.launcherIds),
    }),
    create: (values) => ({
      ...create(values.id),
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
      type: 'static', kindText: 'Bundle', tone: 'master',
      getValueText: (element: Element) => element.id,
    },
    getHierarchyText: ({ element }) => element.id,
    search: { getIdText: (element: Element) => element.id },
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
        action('Delete', () => import('../../../store/tree-store').then(
          ({ default: store }) => store.removeNode(context.node.id),
        ), 'danger'),
      ]
    },
    childSlots: [],
    canDisable: false,
    reorderGroup: 'siblings',
  } satisfies ElementDefinition.Definition<Element>
}

export default BundleElement
