import ObjectShape from '@system/model/type-system/object/object-shape'
import SignatureDefinition from '@system/model/type-system/signature/signature-definition'
import TypeCatalog from '@system/model/type-system/type-catalog'
import UnionDefinition from '@system/model/type-system/union/union-definition'
import StyleParameterCatalog from '@system/model/view/style/style-parameter-catalog'
import { ExpressionVerificationRunner } from '@system/application/validation/expression'
import FunctionDefinition from '@system/model/function/function-definition'
import { ReferenceGraph } from '@system/model/reference/graph'
import HtmlTag from '@system/model/element/html-tag'
import StyleArgumentContract from '@system/model/view/style/style-argument-contract'
import ComponentUseElement from '@system/model/component/component-use'
import ComponentReference from '@system/model/component/component-reference'
import SlotUseElement from '@system/model/component/slot-use'
import EntryElementDefinition from '@system/workspace/element-definition/app/entry-element-definition'
import ContentHost from '@system/model/element/content-host'
import { ExpressionVerificationScope } from '@system/model/validation/expression/scope'
import TreeNode from '@system/model/tree/tree-node'

namespace TreeTransferValidator {
  export type MoveWarning =
    | {
        type: 'reference-target-changed'
        nodeId: number
        sourceLabel: string
      }
    | { type: 'expression-node-unavailable'; nodeId: number }
    | {
        type: 'expression-invalid'
        nodeId: number
        details: readonly string[]
      }
  const validateOptionalRetentionStructure = (
    node: TreeNode.Node,
    label: string,
  ): string | null => {
    const hasStructuredChild = node.children.some((child) => (
      child.element.kind === 'retention' || child.element.kind === 'elements'
    ))
    return hasStructuredChild && !ContentHost.usesRetention(node)
      ? `${label} has an invalid Retention structure.`
      : null
  }

  const validateTag = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node & { element: Extract<TreeNode.Node['element'], { kind: 'tag' }> },
  ): string | null => {
    if (!HtmlTag.canHaveChildren(node.element.tagName) && node.children.length > 0) {
      return `Tag '<${node.element.tagName}>' cannot have children.`
    }
    const retentionError = validateOptionalRetentionStructure(
      node,
      `Tag '<${node.element.tagName}>'`,
    )
    if (retentionError != null) return retentionError

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

  const validateConditional = (node: TreeNode.Node): string | null => {
    const branchKinds = node.children.map((child) => child.element.kind)
    const elseIndex = branchKinds.indexOf('else')
    if (
      branchKinds[0] !== 'if'
      || branchKinds.filter((kind) => kind === 'if').length !== 1
      || branchKinds.some((kind) => !['if', 'else-if', 'else'].includes(kind))
      || branchKinds.filter((kind) => kind === 'else').length > 1
      || (elseIndex >= 0 && elseIndex !== branchKinds.length - 1)
    ) return 'Conditional has an invalid branch structure.'
    return null
  }

  const validateSwitch = (node: TreeNode.Node): string | null => {
    const branchKinds = node.children.map((child) => child.element.kind)
    const defaultIndex = branchKinds.indexOf('default')
    const caseValues = node.children.flatMap((child) => (
      child.element.kind === 'case'
        ? [JSON.stringify(child.element.value)]
        : []
    ))
    if (
      branchKinds.some((kind) => kind !== 'case' && kind !== 'default')
      || branchKinds.filter((kind) => kind === 'default').length > 1
      || (defaultIndex >= 0 && defaultIndex !== branchKinds.length - 1)
      || new Set(caseValues).size !== caseValues.length
    ) return 'Switch has an invalid Case structure.'
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

  const validateEntry = (
    rootNode: TreeNode.Node,
    node: TreeNode.Node & { element: Extract<TreeNode.Node['element'], { kind: 'entry' }> },
  ): string | null => {
    if (node.element.componentId == null) {
      return node.element.propBindings.length === 0
        ? null
        : 'Entry without a Component cannot have bindings.'
    }
    const option = EntryElementDefinition.getComponents(rootNode, node.id)
      .find((candidate) => candidate.componentId === node.element.componentId)
    if (option == null) return 'Entry refers to an unavailable Component.'
    return ComponentReference.validateBindings(
      ComponentReference.stringifyBindings(node.element.propBindings),
      option,
    )
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
        if (node.element.signature.mode === 'refer') {
          const signatureTypeId = node.element.signature.signatureTypeId
          if (!TypeCatalog.collectVisibleSignatures(rootNode, node.id).some((entry) => (
            entry.element.typeId === signatureTypeId
          ))) return `Function '${node.element.id}' refers to an unavailable Signature.`
        }
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
      case 'loop':
        return validateOptionalRetentionStructure(node, 'Loop')
      case 'conditional':
        return validateConditional(node)
      case 'switch':
        return validateSwitch(node)
      case 'if':
      case 'else-if':
      case 'else':
      case 'case':
      case 'default':
        return validateOptionalRetentionStructure(node, node.element.kind)
      case 'component-use':
        return validateComponentUse(
          rootNode,
          node as Parameters<typeof validateComponentUse>[1],
        )
      case 'entry':
        return validateEntry(rootNode, node as Parameters<typeof validateEntry>[1])
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
      && copiedNode.element.kind !== 'app'
      && copiedNode.element.kind !== 'bundle'
      && copiedNode.element.kind !== 'object-type'
      && copiedNode.element.kind !== 'union-type'
      && copiedNode.element.kind !== 'signature-type'
      && copiedNode.element.kind !== 'function'
      && copiedNode.element.kind !== 'component'
      && copiedNode.element.kind !== 'tag'
      && copiedNode.element.kind !== 'text'
      && copiedNode.element.kind !== 'loop'
      && copiedNode.element.kind !== 'conditional'
      && copiedNode.element.kind !== 'switch'
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

  export const validateMoveStructure = (
    previousRoot: TreeNode.Node,
    candidateRoot: TreeNode.Node,
    movedNodeId: number,
  ): string | null => {
    if (TreeNode.findNode(candidateRoot, movedNodeId) == null) {
      return `node-${movedNodeId} is no longer available.`
    }

    const visit = (node: TreeNode.Node): string | null => {
      const candidateError = validateNodeStructure(candidateRoot, node)
      if (candidateError != null) {
        const previousNode = TreeNode.findNode(previousRoot, node.id)
        const previousError = previousNode == null
          ? null
          : validateNodeStructure(previousRoot, previousNode)
        if (candidateError !== previousError) {
          return `Moving this element would make node-${node.id} invalid: ${candidateError}`
        }
      }
      for (const child of node.children) {
        const childError = visit(child)
        if (childError != null) return childError
      }
      return null
    }
    return visit(candidateRoot)
  }

  const dependencyKey = (
    dependency: ReferenceGraph.SemanticDependency,
  ): string => JSON.stringify([
    dependency.sourceNodeId,
    dependency.sourceLabel,
    dependency.sourceType,
    dependency.targetNodeId,
    dependency.targetLabel,
  ])

  export const findMoveReferenceTargetChange = (
    previousRoot: TreeNode.Node,
    candidateRoot: TreeNode.Node,
    sourceType?: ReferenceGraph.ReferenceSourceType,
  ): Extract<MoveWarning, { type: 'reference-target-changed' }> | null => {
    const selectDependencies = (rootNode: TreeNode.Node) => (
      ReferenceGraph.collectSemanticDependencies(rootNode)
        .filter((dependency) => sourceType == null || dependency.sourceType === sourceType)
    )
    const previous = selectDependencies(previousRoot)
    const candidate = selectDependencies(candidateRoot)
    const previousKeys = new Set(previous.map(dependencyKey))
    const candidateKeys = new Set(candidate.map(dependencyKey))
    const removed = previous.find((dependency) => !candidateKeys.has(dependencyKey(dependency)))
    const added = candidate.find((dependency) => !previousKeys.has(dependencyKey(dependency)))
    const changed = removed ?? added
    return changed == null ? null : {
      type: 'reference-target-changed',
      nodeId: changed.sourceNodeId,
      sourceLabel: changed.sourceLabel,
    }
  }

  export const validateMoveReferenceTargets = (
    previousRoot: TreeNode.Node,
    candidateRoot: TreeNode.Node,
    sourceType?: ReferenceGraph.ReferenceSourceType,
  ): string | null => {
    const warning = findMoveReferenceTargetChange(
      previousRoot,
      candidateRoot,
      sourceType,
    )
    return warning == null
      ? null
      : `Moving this element would change a reference target at node-${warning.nodeId}: ${warning.sourceLabel}.`
  }

  export const inspectMoveExpressionScope = async (
    previousRoot: TreeNode.Node,
    candidateRoot: TreeNode.Node,
    movedNodeId: number,
  ): Promise<Exclude<MoveWarning, { type: 'reference-target-changed' }> | null> => {
    const nodeIds = [...new Set([
      ...ExpressionVerificationScope.collectSubtreeVerificationNodeIds(
        previousRoot,
        movedNodeId,
      ),
      ...ExpressionVerificationScope.collectSubtreeVerificationNodeIds(
        candidateRoot,
        movedNodeId,
      ),
    ])]

    for (const nodeId of nodeIds) {
      const previousNode = TreeNode.findNode(previousRoot, nodeId)
      const candidateNode = TreeNode.findNode(candidateRoot, nodeId)
      if (previousNode == null || candidateNode == null) {
        return { type: 'expression-node-unavailable', nodeId }
      }
      const [previous, candidate] = await Promise.all([
        ExpressionVerificationRunner.verify(previousRoot, previousNode),
        ExpressionVerificationRunner.verify(candidateRoot, candidateNode),
      ])
      if (candidate?.status !== 'error') continue
      const previousMessages = new Set(previous?.status === 'error' ? previous.messages : [])
      const introduced = candidate.messages.filter((message) => !previousMessages.has(message))
      if (introduced.length > 0) {
        return {
          type: 'expression-invalid',
          nodeId,
          details: introduced,
        }
      }
    }
    return null
  }

  export const validateMoveExpressionScope = async (
    previousRoot: TreeNode.Node,
    candidateRoot: TreeNode.Node,
    movedNodeId: number,
  ): Promise<string | null> => {
    const warning = await inspectMoveExpressionScope(
      previousRoot,
      candidateRoot,
      movedNodeId,
    )
    if (warning == null) return null
    return warning.type === 'expression-node-unavailable'
      ? `node-${warning.nodeId} is no longer available.`
      : `The moved element is not valid in this scope at node-${warning.nodeId}: ${warning.details.join(' ')}`
  }
}

export default TreeTransferValidator
