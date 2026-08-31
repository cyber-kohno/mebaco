import type TreeNode from '../../../../tree/tree-node'
import type TagElement from '../tag/tag-element'
import StyleArgumentContract from './style-argument-contract'
import type StyleElement from './style-element'
import StyleParameterCatalog from './style-parameter-catalog'

namespace StyleInheritanceBindingSync {
  export type Result = {
    updatedNodeIds: readonly number[]
    contractChangedStyleIds: readonly string[]
  }

  type StyleNode = TreeNode.Node & { element: StyleElement.Element }

  const findNode = (
    node: TreeNode.Node,
    nodeId: number,
  ): TreeNode.Node | null => {
    if (node.id === nodeId) return node
    for (const child of node.children) {
      const found = findNode(child, nodeId)
      if (found != null) return found
    }
    return null
  }

  const collectStyleNodes = (
    rootNode: TreeNode.Node,
  ): StyleNode[] => {
    const result: StyleNode[] = []
    const visit = (node: TreeNode.Node) => {
      if (node.element.kind === 'style') result.push(node as StyleNode)
      node.children.forEach(visit)
    }
    visit(rootNode)
    return result
  }

  const sortByInheritance = (
    styleNodes: readonly StyleNode[],
  ): StyleNode[] => {
    const byStyleId = new Map(styleNodes.map((node) => [node.element.styleId, node]))
    const indegree = new Map(styleNodes.map((node) => [node.element.styleId, 0]))
    const children = new Map<string, string[]>()

    styleNodes.forEach((node) => {
      node.element.bases.forEach((base) => {
        if (!byStyleId.has(base.styleId)) return
        indegree.set(node.element.styleId, (indegree.get(node.element.styleId) ?? 0) + 1)
        children.set(base.styleId, [
          ...(children.get(base.styleId) ?? []),
          node.element.styleId,
        ])
      })
    })

    const queue = styleNodes
      .filter((node) => indegree.get(node.element.styleId) === 0)
      .map((node) => node.element.styleId)
    const result: StyleNode[] = []
    while (queue.length > 0) {
      const styleId = queue.shift()
      if (styleId == null) break
      const node = byStyleId.get(styleId)
      if (node != null) result.push(node)
      ;(children.get(styleId) ?? []).forEach((childStyleId) => {
        const next = (indegree.get(childStyleId) ?? 0) - 1
        indegree.set(childStyleId, next)
        if (next === 0) queue.push(childStyleId)
      })
    }

    if (result.length !== styleNodes.length) {
      throw new StyleArgumentContract.InvariantError('Style inheritance contains a cycle.')
    }
    return result
  }

  const assertResolution = (
    styleName: string,
    result: StyleParameterCatalog.Result,
  ): void => {
    if (result.issues.length === 0) return
    throw new StyleArgumentContract.InvariantError(
      `Style '${styleName}' has an invalid parameter contract: ${result.issues[0].message}`,
    )
  }

  const reconcileArguments = (
    arguments_: readonly StyleElement.Argument[],
    removedParameterIds: ReadonlySet<string>,
    addedParameters: readonly StyleParameterCatalog.Parameter[],
  ): StyleElement.Argument[] => {
    const next = arguments_.filter((argument) => (
      !removedParameterIds.has(argument.parameterId)
    ))
    addedParameters.forEach((parameter) => {
      if (next.some((argument) => argument.parameterId === parameter.parameterId)) return
      next.push({
        parameterId: parameter.parameterId,
        binding: StyleArgumentContract.createResolvedBinding(parameter),
      })
    })
    return next
  }

  const reconcileReferences = (
    rootNode: TreeNode.Node,
    targetStyleId: string,
    removedParameterIds: ReadonlySet<string>,
    addedParameters: readonly StyleParameterCatalog.Parameter[],
    updatedNodeIds: Set<number>,
  ) => {
    const visit = (node: TreeNode.Node) => {
      if (node.element.kind === 'style') {
        const bases = node.element.bases.map((base) => (
          base.styleId !== targetStyleId
            ? base
            : {
                ...base,
                arguments: reconcileArguments(
                  base.arguments,
                  removedParameterIds,
                  addedParameters,
                ),
              }
        ))
        if (JSON.stringify(bases) !== JSON.stringify(node.element.bases)) {
          node.element = { ...node.element, bases }
          updatedNodeIds.add(node.id)
        }
      } else if (node.element.kind === 'tag') {
        const styles = node.element.styles.map((style) => (
          style.styleId !== targetStyleId
            ? style
            : {
                ...style,
                arguments: reconcileArguments(
                  style.arguments,
                  removedParameterIds,
                  addedParameters,
                ) as TagElement.StyleArgument[],
              }
        ))
        if (JSON.stringify(styles) !== JSON.stringify(node.element.styles)) {
          node.element = { ...node.element, styles }
          updatedNodeIds.add(node.id)
        }
      }
      node.children.forEach(visit)
    }
    visit(rootNode)
  }

  export const update = (
    previousRoot: TreeNode.Node,
    nextRoot: TreeNode.Node,
    styleNodeId: number,
  ): Result => {
    const previousNode = findNode(previousRoot, styleNodeId)
    const nextNode = findNode(nextRoot, styleNodeId)
    if (previousNode?.element.kind !== 'style' || nextNode?.element.kind !== 'style') {
      throw new StyleArgumentContract.InvariantError(`node-${styleNodeId} is not a Style.`)
    }
    if (JSON.stringify(previousNode.element.bases) === JSON.stringify(nextNode.element.bases)) {
      return { updatedNodeIds: [], contractChangedStyleIds: [] }
    }

    const previousCatalog = StyleParameterCatalog.createCatalog(previousRoot)
    const updatedNodeIds = new Set<number>()
    const contractChangedStyleIds: string[] = []
    const sortedStyles = sortByInheritance(collectStyleNodes(nextRoot))

    sortedStyles.forEach((styleNode) => {
      const styleId = styleNode.element.styleId
      const previous = previousCatalog.resolve(styleId)
      const current = StyleParameterCatalog.createCatalog(nextRoot).resolve(styleId)
      assertResolution(styleNode.element.id, previous)
      assertResolution(styleNode.element.id, current)

      const previousIds = new Set(previous.parameters.map((parameter) => parameter.parameterId))
      const currentIds = new Set(current.parameters.map((parameter) => parameter.parameterId))
      const removedParameterIds = new Set(
        previous.parameters
          .filter((parameter) => !currentIds.has(parameter.parameterId))
          .map((parameter) => parameter.parameterId),
      )
      const addedParameters = current.parameters.filter((parameter) => (
        !previousIds.has(parameter.parameterId)
      ))
      if (removedParameterIds.size === 0 && addedParameters.length === 0) return

      contractChangedStyleIds.push(styleId)
      reconcileReferences(
        nextRoot,
        styleId,
        removedParameterIds,
        addedParameters,
        updatedNodeIds,
      )
    })

    return {
      updatedNodeIds: [...updatedNodeIds],
      contractChangedStyleIds,
    }
  }
}

export default StyleInheritanceBindingSync
