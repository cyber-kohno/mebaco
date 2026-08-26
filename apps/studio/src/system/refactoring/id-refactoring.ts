import type ActionMenuState from '../action-menu/action-menu-state'
import ActionMenu from '../action-menu/action-menu-state'
import ExpressionReferenceRenamer from '../analysis/expression-reference-renamer'
import ElementDialog from '../element-dialog/element-dialog-controller'
import type ElementEditSchema from '../element-dialog/element-edit-schema'
import type MebacoElement from '../element/element'
import type ElementDefinition from '../element/element-definition'
import FunctionScope from '../element/kind/function/function-scope'
import StateScope from '../element/kind/variable/store/state-scope'
import TypeCatalog from '../element/kind/type/type-catalog'
import ConfirmDialogController from '../feedback/confirm/confirm-dialog-controller'
import TreeStore from '../store/tree-store'
import type TreeNode from '../tree/tree-node'

namespace IdRefactoring {
  type IdElement = MebacoElement.Element & { id: string }

  type Policy = {
    charset: NonNullable<ElementEditSchema.TextField['charset']>
    label: string
  }

  const policies: Partial<Record<MebacoElement.Kind, Policy>> = {
    app: { charset: 'identifier', label: 'App' },
    component: { charset: 'pascalIdentifier', label: 'Component' },
    'function-argument': { charset: 'jsIdentifier', label: 'Function Argument' },
    function: { charset: 'jsIdentifier', label: 'Function' },
    'launch-argument': { charset: 'jsIdentifier', label: 'Launch Argument' },
    launcher: { charset: 'identifier', label: 'Launcher' },
    'object-type': { charset: 'pascalIdentifier', label: 'Object Type' },
    'signature-type': { charset: 'pascalIdentifier', label: 'Signature Type' },
    slot: { charset: 'jsIdentifier', label: 'Slot' },
    state: { charset: 'jsIdentifier', label: 'State' },
    style: { charset: 'identifier', label: 'Style' },
    'style-param': { charset: 'jsIdentifier', label: 'Style Parameter' },
    'union-type': { charset: 'pascalIdentifier', label: 'Union Type' },
    'value-prop': { charset: 'jsIdentifier', label: 'Value Prop' },
    variable: { charset: 'jsIdentifier', label: 'Variable' },
  }

  const hasId = (element: MebacoElement.Element): element is IdElement => (
    typeof (element as { id?: unknown }).id === 'string'
  )

  const getReservedNames = (
    context: ElementDefinition.ContextMenuContext<IdElement>,
  ): readonly string[] => {
    if (
      context.element.kind === 'object-type'
      || context.element.kind === 'union-type'
      || context.element.kind === 'signature-type'
    ) {
      return TypeCatalog.collectVisibleNamedTypes(context.rootNode, context.node.id)
        .filter((entry) => entry.node.id !== context.node.id)
        .map((entry) => entry.element.id)
    }
    if (context.element.kind === 'function' || context.element.kind === 'variable') {
      const frame = FunctionScope.findFrameNode(context.rootNode, context.node.id)
      if (frame == null) return []
      return context.element.kind === 'function'
        ? FunctionScope.collectFrameFunctions(frame)
            .filter((entry) => entry.node.id !== context.node.id)
            .map((entry) => entry.element.id)
        : FunctionScope.collectFrameVariables(frame)
            .filter((entry) => entry.node.id !== context.node.id)
            .map((entry) => entry.element.id)
    }

    const siblingNames = (context.parentNode?.children ?? [])
      .filter((node) => node.id !== context.node.id && node.element.kind === context.element.kind)
      .flatMap((node) => hasId(node.element) ? [node.element.id] : [])
    if (context.element.kind !== 'state') return siblingNames
    return [
      ...siblingNames,
      ...StateScope.getAncestorStateIds(
        context.rootNode,
        context.parentNode?.id ?? context.node.id,
      ).filter((id) => id !== context.element.id),
    ]
  }

  const createSchema = (
    context: ElementDefinition.ContextMenuContext<IdElement>,
    policy: Policy,
  ): ElementEditSchema.Schema<IdElement> => ({
    createTitle: `Rename ${policy.label} Id`,
    updateTitle: `Rename ${policy.label} Id`,
    fields: [{
      type: 'text',
      key: 'id',
      label: 'Id',
      width: 'id',
      required: true,
      charset: policy.charset,
      minLength: 1,
      maxLength: 32,
      reservedNames: getReservedNames(context),
    }],
    getInitialValues: (element) => ({ id: element.id }),
    create: () => context.element,
    update: (element, values) => ({ ...element, id: values.id }),
    commitUpdate: (nodeId, previousElement, nextElement) => {
      if (previousElement.id === nextElement.id) return
      const result = ExpressionReferenceRenamer.rename(
        context.rootNode,
        nodeId,
        nextElement.id,
      )
      TreeStore.commitRootChange(result.rootNode)
      if (result.changedNodeIds.length > 0) {
        void ConfirmDialogController.openNotice({
          title: 'References Updated',
          message: `Updated references in ${result.changedNodeIds.length} ${result.changedNodeIds.length === 1 ? 'element' : 'elements'}.`,
        })
      }
    },
  })

  export const add = (
    items: readonly ActionMenuState.Item[],
    context: ElementDefinition.ContextMenuContext<MebacoElement.Element>,
  ): ActionMenuState.Item[] => {
    const policy = policies[context.element.kind]
    if (policy == null || !hasId(context.element)) return [...items]
    const { action } = ActionMenu.createFactory()
    const rename = action('Rename Id', () => ElementDialog.openUpdate(
      context.node.id,
      context.element,
      createSchema(
        context as ElementDefinition.ContextMenuContext<IdElement>,
        policy,
      ),
    ))
    const modifyIndex = items.findIndex((item) => item.type === 'action' && item.label === 'Modify')
    if (modifyIndex < 0) return [rename, ...items]
    return [
      ...items.slice(0, modifyIndex + 1),
      rename,
      ...items.slice(modifyIndex + 1),
    ]
  }
}

export default IdRefactoring
