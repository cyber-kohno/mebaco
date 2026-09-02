import ObjectShape from '../../element/kind/type/object/object-shape'
import SignatureDefinition from '../../element/kind/type/signature/signature-definition'
import TypeCatalog from '../../element/kind/type/type-catalog'
import UnionDefinition from '../../element/kind/type/union/union-definition'
import StyleParameterCatalog from '../../element/kind/view/style/style-parameter-catalog'
import ExpressionVerificationRunner from '../../validation/expression/expression-verification-runner'
import FunctionDefinition from '../../element/kind/function/function-definition'
import ReferenceGraph from '../../analysis/reference/reference-graph'
import TagCatalog from '../../element/kind/view/tag/tag-catalog'
import StyleArgumentContract from '../../element/kind/view/style/style-argument-contract'
import ComponentUseElement from '../../element/kind/component/reference/component-use-element'
import ComponentReference from '../../element/kind/component/shared/component-reference'
import SlotUseElement from '../../element/kind/component/definition/slot/slot-use-element'
import ContentHost from '../../element/content-host'
import TreeNode from '../tree-node'

namespace TreeTransferValidator {
  const validateTag = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node & { element: Extract<TreeNode.Node['element'], { kind: 'tag' }> },
  ): string | null => {
    if (!TagCatalog.canHaveChildren(node.element.tagName) && node.children.length > 0) {
      return `Tag '<${node.element.tagName}>' cannot have children.`
    }
    const hasStructuredChild = node.children.some((child) => (
      child.element.kind === 'retention' || child.element.kind === 'elements'
    ))
    if (hasStructuredChild && !ContentHost.usesRetention(node)) {
      return `Tag '<${node.element.tagName}>' has an invalid Retention structure.`
    }

    const catalog = StyleParameterCatalog.createCatalog(rootNode)
    for (const application of node.element.styles) {
      const resolution = catalog.resolve(application.styleId)
      const issue = resolution.issues[0]
      if (issue != null) return issue.message
      const argumentError = StyleArgumentContract.getInvariantError(
        application.arguments,
        resolution.parameters,
        'application',
      )
      if (argumentError != null) return argumentError
    }
    return null
  }

  const getComponentOption = (
    rootNode: TreeNode.Node,
    sourceNodeId: number,
    componentId: string,
  ): ComponentReference.Option | null => {
    const componentNode = ComponentUseElement.findComponentNode(
      rootNode,
      sourceNodeId,
      componentId,
    )
    if (componentNode?.element.kind !== 'component') return null
    const props = componentNode.children
      .find((child) => child.element.kind === 'props')
      ?.children
      .map((child) => child.element)
      .filter((element): element is Extract<TreeNode.Node['element'], { kind: 'value-prop' }> => (
        element.kind === 'value-prop'
      )) ?? []
    return {
      componentId,
      label: componentNode.element.id,
      props,
    }
  }

  const validateComponentUse = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node & {
      element: Extract<TreeNode.Node['element'], { kind: 'component-use' }>
    },
  ): string | null => {
    if (node.element.componentId == null) {
      return node.element.propBindings.length === 0
        && !node.children.some((child) => child.element.kind === 'slot-contents')
        ? null
        : 'Component View without a Component cannot have bindings or Slot contents.'
    }
    const option = getComponentOption(rootNode, node.id, node.element.componentId)
    if (option == null) return 'Component View refers to an unavailable Component.'
    const bindingError = ComponentReference.validateBindings(
      ComponentReference.stringifyBindings(node.element.propBindings),
      option,
    )
    if (bindingError != null) return bindingError

    const componentNode = ComponentUseElement.findComponentNode(
      rootNode,
      node.id,
      node.element.componentId,
    )
    const expectedSlotIds = componentNode?.children
      .find((child) => child.element.kind === 'slots')
      ?.children
      .filter((child) => child.element.kind === 'slot')
      .map((child) => child.element.kind === 'slot' ? child.element.slotId : '')
      .sort() ?? []
    const folders = node.children.filter((child) => child.element.kind === 'slot-contents')
    const actualSlotIds = folders.flatMap((folder) => folder.children
      .filter((child) => child.element.kind === 'slot-content')
      .map((child) => child.element.kind === 'slot-content' ? child.element.slotId : ''))
      .sort()
    if (
      folders.length !== (expectedSlotIds.length === 0 ? 0 : 1)
      || expectedSlotIds.length !== actualSlotIds.length
      || expectedSlotIds.some((slotId, index) => slotId !== actualSlotIds[index])
    ) return 'Component View has invalid Slot contents.'
    return null
  }

  const validateSlotUse = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node & { element: Extract<TreeNode.Node['element'], { kind: 'slot-use' }> },
  ): string | null => {
    const option = SlotUseElement.getOptions(rootNode, node.id)
      .find((candidate) => candidate.componentId === node.element.slotId)
    if (option == null) return 'Slot Content refers to an unavailable Slot.'
    return ComponentReference.validateBindings(
      ComponentReference.stringifyBindings(node.element.propBindings),
      option,
    )
  }

  const validateNodeStructure = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node,
  ): string | null => {
    switch (node.element.kind) {
      case 'style': {
        const issue = StyleParameterCatalog.createCatalog(rootNode)
          .resolve(node.element.styleId)
          .issues[0]
        return issue?.message ?? null
      }
      case 'object-type':
        return ObjectShape.validate(
          ObjectShape.create(
            node.element.properties,
            node.element.baseObjectIds,
          ),
          TypeCatalog.getObjectOptions(rootNode, node.id),
          TypeCatalog.getNamedTypeOptions(rootNode, node.id),
        )
      case 'union-type':
        return UnionDefinition.validate(
          node.element.definition,
          TypeCatalog.getObjectOptions(rootNode, node.id),
        )
      case 'signature-type':
        return SignatureDefinition.validate(
          {
            async: node.element.async,
            parameters: node.element.parameters,
            returnType: node.element.returnType,
          },
          TypeCatalog.getObjectOptions(rootNode, node.id),
          TypeCatalog.getNamedTypeOptions(rootNode, node.id),
        )
      case 'function': {
        const signature = FunctionDefinition.resolveSignature(rootNode, node.element)
        if (signature == null) return `Function '${node.element.id}' refers to an unavailable Signature.`
        return SignatureDefinition.validate(
          signature,
          TypeCatalog.getObjectOptions(rootNode, node.id),
          TypeCatalog.getNamedTypeOptions(rootNode, node.id),
        )
      }
      case 'tag':
        return validateTag(rootNode, node as Parameters<typeof validateTag>[1])
      case 'component-use':
        return validateComponentUse(
          rootNode,
          node as Parameters<typeof validateComponentUse>[1],
        )
      case 'slot-use':
        return validateSlotUse(rootNode, node as Parameters<typeof validateSlotUse>[1])
      default:
        return null
    }
  }

  export const validateStructure = (
    rootNode: TreeNode.Node,
    copiedNodeId: number,
  ): string | null => {
    const copiedNode = TreeNode.findNode(rootNode, copiedNodeId)
    if (copiedNode == null) return `node-${copiedNodeId} was not found.`

    if (
      copiedNode.element.kind !== 'style'
      && copiedNode.element.kind !== 'object-type'
      && copiedNode.element.kind !== 'union-type'
      && copiedNode.element.kind !== 'signature-type'
      && copiedNode.element.kind !== 'function'
      && copiedNode.element.kind !== 'tag'
    ) return 'This element cannot be copied.'

    const visit = (node: TreeNode.Node): string | null => {
      const error = validateNodeStructure(rootNode, node)
      if (error != null) return error
      for (const child of node.children) {
        const childError = visit(child)
        if (childError != null) return childError
      }
      return null
    }
    return visit(copiedNode)
  }

  export const validateReferenceTargets = (
    previousRoot: TreeNode.Node,
    candidateRoot: TreeNode.Node,
    nodeIds: ReadonlyMap<number, number>,
  ): string | null => {
    const previous = ReferenceGraph.collectDependencies(
      previousRoot,
      [...nodeIds.keys()],
    )
    const copied = ReferenceGraph.collectDependencies(
      candidateRoot,
      [...nodeIds.values()],
    )
    const collectTargets = (
      dependencies: readonly ReferenceGraph.Dependency[],
      sourceNodeId: number,
    ): number[] => dependencies
      .filter((dependency) => dependency.sourceNodeId === sourceNodeId)
      .map((dependency) => dependency.targetNodeId)
      .sort((left, right) => left - right)

    for (const [sourceNodeId, copiedNodeId] of nodeIds) {
      const expected = collectTargets(previous, sourceNodeId)
        .map((targetNodeId) => nodeIds.get(targetNodeId) ?? targetNodeId)
        .sort((left, right) => left - right)
      const actual = collectTargets(copied, copiedNodeId)
      if (
        expected.length !== actual.length
        || expected.some((targetNodeId, index) => targetNodeId !== actual[index])
      ) {
        return `The copied element would change a reference target at node-${sourceNodeId}.`
      }
    }
    return null
  }

  export const validateExpressionScope = async (
    previousRoot: TreeNode.Node,
    sourceNodeId: number,
    candidateRoot: TreeNode.Node,
    copiedNodeId: number,
  ): Promise<string | null> => {
    const sourceNode = TreeNode.findNode(previousRoot, sourceNodeId)
    const copiedNode = TreeNode.findNode(candidateRoot, copiedNodeId)
    if (sourceNode == null || copiedNode == null) return 'The copy source is no longer available.'

    const [previous, copied] = await Promise.all([
      ExpressionVerificationRunner.verify(previousRoot, sourceNode),
      ExpressionVerificationRunner.verify(candidateRoot, copiedNode),
    ])
    if (copied?.status !== 'error') return null
    const previousMessages = new Set(previous?.status === 'error' ? previous.messages : [])
    const introduced = copied.messages.filter((message) => !previousMessages.has(message))
    return introduced.length === 0
      ? null
      : `The copied element is not valid in this scope: ${introduced.join(' ')}`
  }
}

export default TreeTransferValidator
