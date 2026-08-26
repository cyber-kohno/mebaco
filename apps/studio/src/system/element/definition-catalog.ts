import type MebacoElement from './element'
import type TreeNode from '../tree/tree-node'

namespace DefinitionCatalog {
  export const getDefinitionId = (
    element: MebacoElement.Element,
  ): string | null => {
    switch (element.kind) {
      case 'app':
        return element.appId
      case 'component':
        return element.componentId
      case 'launch-argument':
      case 'value-prop':
        return element.propId
      case 'launcher':
        return element.launcherId
      case 'slot':
        return element.slotId
      case 'style':
        return element.styleId
      case 'style-param':
        return element.parameterId
      case 'object-type':
      case 'signature-type':
      case 'union-type':
        return element.typeId
      default:
        return null
    }
  }

  export const findNode = (
    rootNode: TreeNode.Node,
    definitionId: string,
    kinds?: ReadonlySet<string>,
  ): TreeNode.Node | null => {
    if (
      (kinds == null || kinds.has(rootNode.element.kind))
      && getDefinitionId(rootNode.element) === definitionId
    ) return rootNode

    for (const child of rootNode.children) {
      const found = findNode(child, definitionId, kinds)
      if (found != null) return found
    }
    return null
  }

  export const resolveName = (
    rootNode: TreeNode.Node,
    definitionId: string,
    kinds?: ReadonlySet<string>,
  ): string | undefined => {
    const element = findNode(rootNode, definitionId, kinds)?.element as {
      id?: unknown
    } | undefined
    return typeof element?.id === 'string' ? element.id : undefined
  }
}

export default DefinitionCatalog
