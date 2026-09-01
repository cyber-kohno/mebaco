import type TreeNode from '../../../tree/tree-node'
import type VariableElement from './variable-element'

namespace SequentialVariableScope {
  export type Entry = {
    node: TreeNode.Node & { element: VariableElement.Element }
    element: VariableElement.Element
  }

  const isSequentialContainer = (
    node: TreeNode.Node,
  ): boolean => (
    node.element.kind === 'retention'
    || node.element.kind === 'function-procedure'
    || node.element.kind === 'promise-then'
    || node.element.kind === 'promise-catch'
    || node.element.kind === 'block'
  )

  export const collectDeclarations = (
    children: readonly TreeNode.Node[],
  ): Entry[] => {
    const result: Entry[] = []
    children.forEach((child) => {
      if (child.element.kind === 'variable') {
        result.push({
          node: child as TreeNode.Node & { element: VariableElement.Element },
          element: child.element,
        })
      } else if (child.element.kind === 'block') {
        result.push(...collectDeclarations(child.children))
      }
    })
    return result
  }

  export const collectPrecedingDeclarations = (
    containerNode: TreeNode.Node,
    nextNode: TreeNode.Node | undefined,
    includeAllChildren: boolean,
  ): Entry[] => {
    if (!isSequentialContainer(containerNode)) return []
    if (nextNode == null) {
      return includeAllChildren
        ? collectDeclarations(containerNode.children)
        : []
    }

    const childIndex = containerNode.children.indexOf(nextNode)
    return childIndex < 0
      ? []
      : collectDeclarations(containerNode.children.slice(0, childIndex))
  }
}

export default SequentialVariableScope
