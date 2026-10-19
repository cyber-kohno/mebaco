import type ActionMenuState from '@system/ui/action-menu/action-menu-state'
import type TreeNode from '@system/model/tree/tree-node'
import ActionMenu from '@system/ui/action-menu/action-menu-state'
import ActionElementDefinition from '@system/workspace/element-definition/variable/action-element-definition'
import ElementDialog from '@system/workspace/element-editor/element-dialog-controller'
import FunctionElementDefinition from '@system/workspace/element-definition/function/function-element-definition'
import FunctionReturnElementDefinition from '@system/workspace/element-definition/function/function-return-element-definition'
import FunctionDefinition from '@system/model/function/function-definition'
import FunctionReturn from '@system/model/function/function-return'
import ObjectTypeElementDefinition from '@system/workspace/element-definition/type-system/object/object-type-element-definition'
import TreeStore from '@system/workspace/tree/state'
import TypeCatalog from '@system/model/type-system/type-catalog'
import UnionTypeElementDefinition from '@system/workspace/element-definition/type-system/union/union-type-element-definition'
import SignatureTypeElementDefinition from '@system/workspace/element-definition/type-system/signature/signature-type-element-definition'
import ValueTypeDefinition from '@system/model/type-system/value-type-definition'
import VariableElementDefinition from '@system/workspace/element-definition/variable/variable-element-definition'
import FunctionScope from '@system/model/function/function-scope'
import ControlConditional from '@system/model/directive/control-conditional'
import Switch from '@system/model/directive/switch'
import ControlSwitchElementDefinition from '@system/workspace/element-definition/directive/control-switch-element-definition'
import TransitionElementDefinition from '@system/workspace/element-definition/variable/transition-element-definition'
import PromiseElementDefinition from '@system/workspace/element-definition/promise/promise-element-definition'
import { AppSettings } from '@system/application/settings'

namespace FunctionActions {
  const findNode = (
    node: TreeNode.Node,
    targetNodeId: number,
  ): TreeNode.Node | null => {
    if (node.id === targetNodeId) return node
    for (const child of node.children) {
      const found = findNode(child, targetNodeId)
      if (found != null) return found
    }
    return null
  }

  const getFrameNode = (
    rootNode: TreeNode.Node,
    parentNodeId: number,
  ): TreeNode.Node | null => (
    FunctionScope.findFrameNode(rootNode, parentNodeId)
    ?? findNode(rootNode, parentNodeId)
  )

  const collectFrameIds = (
    rootNode: TreeNode.Node,
    parentNodeId: number,
    kind: 'variable' | 'function',
  ): string[] => {
    const frameNode = getFrameNode(rootNode, parentNodeId)
    if (frameNode == null) return []
    if (kind === 'function') {
      return FunctionScope.collectFrameFunctions(frameNode).map((entry) => entry.element.id)
    }
    const ids = FunctionScope.collectFrameVariables(frameNode).map((entry) => entry.element.id)
    const path = FunctionScope.findPath(rootNode, parentNodeId) ?? []
    const branchNode = [...path].reverse().find((node) => (
      node.element.kind === 'promise-then'
      || node.element.kind === 'promise-catch'
    ))
    if (branchNode?.element.kind === 'promise-catch') ids.push(branchNode.element.id)
    if (branchNode?.element.kind === 'promise-then') {
      const branchIndex = path.indexOf(branchNode)
      const promiseNode = path[branchIndex - 1]
      if (promiseNode?.element.kind === 'promise' && promiseNode.element.resultType != null) {
        ids.push(promiseNode.element.id)
      }
    }
    return [...new Set(ids)]
  }

  export const createAddFunctionItem = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
    options: {
      insertIndex?: number
      label?: string
    } = {},
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action(options.label ?? 'Function', () => {
      const defaults = AppSettings.getElementDefaults()
      ElementDialog.openCreate(
        parentNodeId,
        FunctionElementDefinition.createSchema({
          reservedNames: collectFrameIds(rootNode, parentNodeId, 'function'),
          objectOptions: TypeCatalog.getObjectOptions(rootNode, parentNodeId),
          namedTypeOptions: TypeCatalog.getNamedTypeOptions(rootNode, parentNodeId),
          initialSignatureMode: defaults.functionSignatureMode,
          initialImplementationMode: defaults.functionImplementationMode,
          rootNode,
        }),
        options.insertIndex,
      )
    })
  }

  export const createAddDeclareMenu = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
    insertIndex?: number,
  ): ActionMenuState.ParentItem => {
    const { action, parent } = ActionMenu.createFactory()
    const frameNode = getFrameNode(rootNode, parentNodeId)
    const typeNames = frameNode == null ? [] : FunctionScope.collectFrameTypeNames(frameNode)
    const referenceOptions = TypeCatalog.getReferenceOptions(rootNode, parentNodeId)
    const namedTypeOptions = TypeCatalog.getNamedTypeOptions(rootNode, parentNodeId)
    const objectOptions = TypeCatalog.getObjectOptions(rootNode, parentNodeId)

    return parent('Add declare', [
      action('Variable', () => ElementDialog.openCreate(
        parentNodeId,
        VariableElementDefinition.createSchema({
          reservedNames: collectFrameIds(rootNode, parentNodeId, 'variable'),
          referenceOptions,
          namedTypeOptions,
        }),
        insertIndex,
      )),
      createAddFunctionItem(parentNodeId, rootNode, { insertIndex }),
      action('Object', () => ElementDialog.openCreate(
        parentNodeId,
        ObjectTypeElementDefinition.createSchema({
          reservedNames: typeNames,
          objectOptions,
          namedTypeOptions,
        }),
        insertIndex,
      )),
      action('Union', () => ElementDialog.openCreate(
        parentNodeId,
        UnionTypeElementDefinition.createSchema({ reservedNames: typeNames, objectOptions }),
        insertIndex,
      )),
      action('Signature', () => ElementDialog.openCreate(
        parentNodeId,
        SignatureTypeElementDefinition.createSchema({
          reservedNames: typeNames,
          objectOptions,
          namedTypeOptions,
        }),
        insertIndex,
      )),
    ])
  }

  export const createAddActionItem = (
    parentNodeId: number,
    insertIndex?: number,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action('Action', () => ElementDialog.openCreate(
      parentNodeId,
      ActionElementDefinition.createSchema(),
      insertIndex,
    ))
  }

  export const createAddTransitionItem = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
    insertIndex?: number,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action('Transition', () => ElementDialog.openCreate(
      parentNodeId,
      TransitionElementDefinition.createSchema(rootNode, parentNodeId),
      insertIndex,
    ))
  }

  export const createAddPromiseItem = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
    insertIndex?: number,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action('Promise', () => ElementDialog.openCreate(
      parentNodeId,
      PromiseElementDefinition.createSchema({
        reservedNames: collectFrameIds(rootNode, parentNodeId, 'variable'),
        referenceOptions: TypeCatalog.getReferenceOptions(rootNode, parentNodeId),
        namedTypeOptions: TypeCatalog.getNamedTypeOptions(rootNode, parentNodeId),
      }),
      insertIndex,
    ))
  }

  export const createAddStatementMenu = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
    insertIndex?: number,
    includeReturn = true,
  ): ActionMenuState.ParentItem => {
    const { parent } = ActionMenu.createFactory()
    const isPromiseBranch = FunctionScope.findPath(rootNode, parentNodeId)?.some(
      (node) => (
        node.element.kind === 'promise-then'
        || node.element.kind === 'promise-catch'
      ),
    ) === true
    return parent('Add statement', [
      createAddActionItem(parentNodeId, insertIndex),
      createAddPromiseItem(parentNodeId, rootNode, insertIndex),
      createAddTransitionItem(parentNodeId, rootNode, insertIndex),
      ...(includeReturn && !isPromiseBranch
        ? [createAddReturnItem(parentNodeId, rootNode)]
        : []),
    ])
  }

  export const createAddBlockItem = (
    parentNodeId: number,
    insertIndex?: number,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action('Add block', () => TreeStore.addChild(
      parentNodeId,
      { kind: 'block', label: '' },
      insertIndex,
    ))
  }

  export const createReturnSchema = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ) => {
    const owner = FunctionScope.findOwnerFunction(rootNode, targetNodeId)
    const returnType = owner == null
      ? null
      : FunctionDefinition.getReturnType(rootNode, owner.element)
    return FunctionReturnElementDefinition.createSchema({
      required: returnType != null,
      expectedTypeText: returnType == null
        ? undefined
        : ValueTypeDefinition.getTypeText(
            returnType,
            (id) => TypeCatalog.resolveTypeScriptName(rootNode, id),
          ),
    })
  }

  export const createAddReturnItem = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
  ): ActionMenuState.ActionItem => {
    const { action } = ActionMenu.createFactory()
    return action('Return', () => {
      const owner = FunctionScope.findOwnerFunction(rootNode, parentNodeId)
      const returnType = owner == null
        ? null
        : FunctionDefinition.getReturnType(rootNode, owner.element)
      if (returnType == null) {
        TreeStore.addChild(parentNodeId, FunctionReturn.create())
        return
      }
      ElementDialog.openCreate(
        parentNodeId,
        createReturnSchema(rootNode, parentNodeId),
      )
    })
  }

  export const createAddControlMenu = (
    parentNodeId: number,
    rootNode: TreeNode.Node,
  ): ActionMenuState.ParentItem => {
    const { action, parent } = ActionMenu.createFactory()
    return parent('Add directive', [
      action('Conditional', () => TreeStore.addChild(parentNodeId, ControlConditional.create())),
      action('Switch', () => ElementDialog.openCreate(
        parentNodeId,
        ControlSwitchElementDefinition.createSchema({
          literalUnionOptions: Switch.getLiteralUnionOptions(rootNode, parentNodeId),
        }),
      )),
    ])
  }
}

export default FunctionActions
