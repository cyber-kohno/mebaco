import type FunctionArgumentElement from './function-argument-element'
import type FunctionElement from './function-element'
import type TreeNode from '../../../tree/tree-node'
import type VariableElement from '../variable/variable-element'
import ContentHost from '../../content-host'

namespace FunctionScope {
  export type Entry = {
    node: TreeNode.Node
    element: FunctionElement.Element
  }

  export type ValidationIssue = {
    nodeId: number
    field: 'id'
    message: string
  }

  export const findPath = (
    node: TreeNode.Node,
    targetNodeId: number,
    path: TreeNode.Node[] = [],
  ): TreeNode.Node[] | null => {
    const nextPath = [...path, node]
    if (node.id === targetNodeId) return nextPath
    for (const child of node.children) {
      const found = findPath(child, targetNodeId, nextPath)
      if (found != null) return found
    }
    return null
  }

  const findDirectChild = (
    node: TreeNode.Node,
    kind: TreeNode.Node['element']['kind'],
  ): TreeNode.Node | null => (
    node.children.find((child) => child.element.kind === kind) ?? null
  )

  const findFunctionsManager = (
    ownerNode: TreeNode.Node,
  ): TreeNode.Node | null => {
    const declaresNode = findDirectChild(ownerNode, 'declares')
    return declaresNode == null ? null : findDirectChild(declaresNode, 'functions')
  }

  const toFunctionEntry = (
    node: TreeNode.Node,
  ): Entry | null => node.element.kind === 'function'
    ? { node, element: node.element }
    : null

  const collectManagerFunctions = (
    managerNode: TreeNode.Node | null,
  ): Entry[] => managerNode?.children.flatMap((node) => {
    const entry = toFunctionEntry(node)
    return entry == null ? [] : [entry]
  }) ?? []

  const collectFrameNodes = (
    frameNode: TreeNode.Node,
    kind: 'function' | 'variable' | 'object-type' | 'union-type',
  ): TreeNode.Node[] => {
    const result: TreeNode.Node[] = []
    const collect = (children: readonly TreeNode.Node[]) => {
      children.forEach((child) => {
        if (child.element.kind === kind) result.push(child)
        if (child.element.kind === 'block') collect(child.children)
      })
    }
    collect(frameNode.children)
    return result
  }

  export const collectFrameFunctions = (
    frameNode: TreeNode.Node,
  ): Entry[] => collectFrameNodes(frameNode, 'function').flatMap((node) => {
    const entry = toFunctionEntry(node)
    return entry == null ? [] : [entry]
  })

  export const collectFrameVariables = (
    frameNode: TreeNode.Node,
  ): Array<{ node: TreeNode.Node; element: VariableElement.Element }> => (
    collectFrameNodes(frameNode, 'variable').flatMap((node) => (
      node.element.kind === 'variable'
        ? [{ node, element: node.element }]
        : []
    ))
  )

  export const collectDefinedFunctions = (
    rootNode: TreeNode.Node,
    scopeNodeId: number,
  ): Entry[] => {
    const path = findPath(rootNode, scopeNodeId) ?? []
    const scopeNode = path[path.length - 1]
    if (scopeNode == null) return []
    if (scopeNode.element.kind === 'functions') {
      return collectManagerFunctions(scopeNode)
    }
    if (scopeNode.element.kind === 'app' || scopeNode.element.kind === 'common') {
      return collectManagerFunctions(findFunctionsManager(scopeNode))
    }
    const frameNode = [...path].reverse().find((node) => (
      node.element.kind === 'retention'
      || node.element.kind === 'function-procedure'
    ))
    return frameNode == null ? [] : collectFrameFunctions(frameNode)
  }

  export const collectFrameTypeNames = (
    frameNode: TreeNode.Node,
  ): string[] => [
    ...collectFrameNodes(frameNode, 'object-type'),
    ...collectFrameNodes(frameNode, 'union-type'),
  ].flatMap((node) => (
    node.element.kind === 'object-type' || node.element.kind === 'union-type'
      ? [node.element.id]
      : []
  ))

  export const findFrameNode = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): TreeNode.Node | null => {
    const path = findPath(rootNode, targetNodeId) ?? []
    return [...path].reverse().find((node) => (
      node.element.kind === 'functions'
      || node.element.kind === 'retention'
      || node.element.kind === 'function-procedure'
    )) ?? null
  }

  export const collectVisibleFunctions = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): Entry[] => {
    const path = findPath(rootNode, targetNodeId) ?? []
    const ownerApp = [...path].reverse().find((node) => node.element.kind === 'app')
    const ownerCommon = [...path].reverse().find((node) => node.element.kind === 'common')
    const commonNode = rootNode.children.find(
      (node) => node.element.kind === 'common',
    ) ?? null
    const visible = new Map<string, Entry>()
    const add = (entries: readonly Entry[]) => {
      entries.forEach((entry) => visible.set(entry.element.id, entry))
    }

    add(collectManagerFunctions(findFunctionsManager(ownerCommon ?? commonNode ?? rootNode)))
    if (ownerApp != null) add(collectManagerFunctions(findFunctionsManager(ownerApp)))

    path.forEach((node, index) => {
      if (
        node.element.kind === 'retention'
        || node.element.kind === 'function-procedure'
      ) {
        add(collectFrameFunctions(node))
      }

      const nextNode = path[index + 1]
      const retentionNode = ContentHost.getRetentionNode(node)
      const elementsNode = ContentHost.getElementsNode(node)
      if (retentionNode != null && nextNode === elementsNode) {
        add(collectFrameFunctions(retentionNode))
      }
    })

    return [...visible.values()]
  }

  export const resolveFunction = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    functionId: string,
  ): Entry | null => (
    collectVisibleFunctions(rootNode, targetNodeId)
      .find((entry) => entry.element.id === functionId) ?? null
  )

  export const findOwnerFunction = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): Entry | null => {
    const path = findPath(rootNode, targetNodeId) ?? []
    const node = [...path].reverse().find((item) => item.element.kind === 'function')
    return node?.element.kind === 'function' ? { node, element: node.element } : null
  }

  export const getArguments = (
    functionNode: TreeNode.Node,
  ): FunctionArgumentElement.Element[] => (
    findDirectChild(functionNode, 'function-arguments')?.children.flatMap((child) => (
      child.element.kind === 'function-argument' ? [child.element] : []
    )) ?? []
  )

  const addDuplicateIssues = (
    entries: readonly { node: TreeNode.Node; element: { id: string } }[],
    label: string,
    issues: ValidationIssue[],
  ) => {
    const seen = new Set<string>()
    entries.forEach((entry) => {
      if (seen.has(entry.element.id)) {
        issues.push({
          nodeId: entry.node.id,
          field: 'id',
          message: `${label} '${entry.element.id}' is already declared in this scope.`,
        })
      }
      seen.add(entry.element.id)
    })
  }

  export const validateDeclarations = (
    rootNode: TreeNode.Node,
  ): ValidationIssue[] => {
    const issues: ValidationIssue[] = []
    const visit = (node: TreeNode.Node) => {
      if (
        node.element.kind === 'functions'
        || node.element.kind === 'retention'
        || node.element.kind === 'function-procedure'
      ) {
        addDuplicateIssues(collectFrameFunctions(node), 'Function', issues)
      }
      if (
        node.element.kind === 'retention'
        || node.element.kind === 'function-procedure'
      ) {
        addDuplicateIssues(collectFrameVariables(node), 'Variable', issues)
      }
      if (node.element.kind === 'function-arguments') {
        const argumentsInScope = node.children.flatMap((child) => (
          child.element.kind === 'function-argument'
            ? [{ node: child, element: child.element }]
            : []
        ))
        addDuplicateIssues(argumentsInScope, 'Argument', issues)
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
    return issues
  }
}

export default FunctionScope
