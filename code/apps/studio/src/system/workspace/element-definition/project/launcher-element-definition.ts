import type ElementDefinition from '@system/workspace/element-definition/element-definition'
import type ElementEditSchema from '@system/workspace/element-editor/element-edit-schema'
import ActionMenuState from '@system/ui/action-menu/action-menu-state'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import type TreeNode from '@system/model/tree/tree-node'
import ComponentReference from '@system/model/component/component-reference'
import Launcher from '@system/model/project/launcher'
import LauncherTreeLabel from '@system/workspace/tree/label/project/LauncherTreeLabel.svelte'

namespace LauncherElementDefinition {
  export const createSchema = (rootNode: TreeNode.Node, reservedNames: readonly string[] = []): ElementEditSchema.Schema<Launcher.Element> => {
    const options = Launcher.getAppOptions(rootNode)
    const parse = (values: Readonly<Record<string, string>>): ComponentReference.Binding[] => ComponentReference.normalizeBindings(ComponentReference.parseBindings(values.argumentBindings) ?? [], options.find((option) => option.componentId === values.appId))
    const withOptionalName = (element: Launcher.Element, name: string): Launcher.Element => {
      const { name: _currentName, ...withoutName } = element
      return name.trim().length === 0 ? withoutName : { ...withoutName, name }
    }
    return {
      createTitle: 'Create Launcher', updateTitle: 'Update Launcher',
      fields: [
        { type: 'text', key: 'id', label: 'Id', width: 'id', required: true, charset: 'identifier', minLength: 1, maxLength: 32, reservedNames },
        { type: 'text', key: 'name', label: 'Name', width: 'id', maxLength: 64 },
        { type: 'select', key: 'appId', label: 'App', width: 'id', required: true, options: options.map((option) => ({ value: option.componentId, label: option.label })) , clearWhenChanged: ['argumentBindings'] },
        { type: 'componentBindings', key: 'argumentBindings', label: 'Arguments', defaultValue: '[]', required: true, componentIdKey: 'appId', components: options },
      ],
      createPreview: Launcher.create,
      getInitialValues: (e) => ({ id: e.id, name: e.name ?? '', appId: e.appId ?? '', argumentBindings: ComponentReference.stringifyBindings(e.argumentBindings) }),
      create: (values) => withOptionalName({ ...Launcher.create(), id: values.id, appId: values.appId || null, argumentBindings: parse(values) }, values.name),
      update: (e, values) => withOptionalName({ ...e, id: values.id, appId: values.appId || null, argumentBindings: parse(values) }, values.name),
    }
  }
 export const definition = { kind: 'launcher', treeLabel: { type: 'component', Component: LauncherTreeLabel }, search: { getIdText: (element: Launcher.Element) => element.id }, getContextMenu: (context) => { const { action } = ActionMenuState.createFactory(); const reservedNames = context.parentNode?.children.filter((n) => n.id !== context.node.id).map((n) => n.element).filter((e): e is Launcher.Element => e.kind === 'launcher').map((e) => e.id) ?? []; return [action('Modify', () => ElementDialog.openUpdate(context.node.id, context.element, createSchema(context.rootNode, reservedNames))), action('Delete', () => { void Promise.all([import('@system/workspace/tree/state'), import('@system/workspace/element-editor/deletion/element-deletion-controller')]).then(([{ default: store }, { default: deletion }]) => deletion.requestDelete({ rootNode: context.rootNode, node: context.node, policy: { label: 'Launcher', structuralReferences: 'block' }, deleteNode: () => store.removeNode(context.node.id) })) }, 'danger')] }, childSlots: [], canDisable: false, reorderGroup: 'siblings' } satisfies ElementDefinition.Definition<Launcher.Element>
}
export default LauncherElementDefinition
