import type ElementDefinition from '../../element-definition'
import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
import ActionMenuState from '../../../action-menu/action-menu-state'
import ElementDialog from '../../../element-dialog/element-dialog-controller'
import type TreeNode from '../../../tree/tree-node'
import ComponentReference from '../component/shared/component-reference'
import type LaunchArgumentElement from '../app/launch/launch-argument-element'
import LaunchArgumentValueProp from '../app/launch/launch-argument-value-prop'
import LauncherTreeLabel from './LauncherTreeLabel.svelte'

namespace LauncherElement {
  export type Kind = 'launcher'
  export type Element = { kind: Kind; launcherId: string; id: string; name: string; appId: string | null; argumentBindings: ComponentReference.Binding[] }
  export const create = (
    launcherId: string = crypto.randomUUID(),
  ): Element => ({ kind: 'launcher', launcherId, id: '...', name: '...', appId: null, argumentBindings: [] })
  const apps = (node: TreeNode.Node): TreeNode.Node[] => [
    ...(node.element.kind === 'app' ? [node] : []), ...node.children.flatMap(apps),
  ]
  export const getAppOption = (node: TreeNode.Node): ComponentReference.Option | null => {
    if (node.element.kind !== 'app') return null
    const argsNode = node.children.find((child) => child.element.kind === 'launch-options')?.children.find((child) => child.element.kind === 'launch-arguments')
    const props = (argsNode?.children ?? [])
      .filter((child): child is TreeNode.Node & { element: LaunchArgumentElement.Element } => child.element.kind === 'launch-argument')
      .map((child) => LaunchArgumentValueProp.convert(child.element))
    return { componentId: node.element.appId, label: node.element.id, props }
  }
  export const getAppOptions = (rootNode: TreeNode.Node): ComponentReference.Option[] => (
    apps(rootNode).map(getAppOption).filter((option): option is ComponentReference.Option => option != null)
  )
  export const createSchema = (rootNode: TreeNode.Node, reservedNames: readonly string[] = []): ElementEditSchema.Schema<Element> => {
    const options = getAppOptions(rootNode)
    const parse = (values: Readonly<Record<string, string>>): ComponentReference.Binding[] => ComponentReference.normalizeBindings(ComponentReference.parseBindings(values.argumentBindings) ?? [], options.find((option) => option.componentId === values.appId))
    return {
      createTitle: 'Create Launcher', updateTitle: 'Update Launcher',
      fields: [
        { type: 'text', key: 'id', label: 'Id', width: 'id', required: true, charset: 'identifier', minLength: 1, maxLength: 32, reservedNames },
        { type: 'text', key: 'name', label: 'Name', width: 'id', required: true, minLength: 1, maxLength: 64 },
        { type: 'select', key: 'appId', label: 'App', width: 'id', options: options.map((option) => ({ value: option.componentId, label: option.label })) , clearWhenChanged: ['argumentBindings'] },
        { type: 'componentBindings', key: 'argumentBindings', label: 'Arguments', defaultValue: '[]', required: true, componentIdKey: 'appId', components: options },
      ],
      createPreview: create,
      getInitialValues: (e) => ({ id: e.id, name: e.name, appId: e.appId ?? '', argumentBindings: ComponentReference.stringifyBindings(e.argumentBindings) }),
      create: (values) => ({ ...create(), id: values.id, name: values.name, appId: values.appId || null, argumentBindings: parse(values) }),
      update: (e, values) => ({ ...e, id: values.id, name: values.name, appId: values.appId || null, argumentBindings: parse(values) }),
    }
  }
 export const definition = { kind: 'launcher', treeLabel: { type: 'component', Component: LauncherTreeLabel }, search: { getIdText: (element: Element) => element.id }, getContextMenu: (context) => { const { action } = ActionMenuState.createFactory(); const reservedNames = context.parentNode?.children.filter((n) => n.id !== context.node.id).map((n) => n.element).filter((e): e is Element => e.kind === 'launcher').map((e) => e.id) ?? []; return [action('Modify', () => ElementDialog.openUpdate(context.node.id, context.element, createSchema(context.rootNode, reservedNames))), action('Delete', () => import('../../../store/tree-store').then(({ default: store }) => store.removeNode(context.node.id)), 'danger')] }, childSlots: [], canDisable: false, reorderGroup: 'siblings' } satisfies ElementDefinition.Definition<Element>
}
export default LauncherElement
