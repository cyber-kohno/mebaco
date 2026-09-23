import DefinitionCatalog from '@system/model/element/definition-catalog'
import type TreeNode from '@system/model/tree/tree-node'
import type StyleElement from './style'

namespace StyleTreeLabelPresentation {
  export const countProperties = (
    element: StyleElement.Element,
  ): number => element.rules.reduce((count, rule) => (
    count + (rule.type === 'declaration' ? 1 : rule.declarations.length)
  ), 0)

  export const getInheritedStyleNames = (
    rootNode: TreeNode.Node | undefined,
    element: StyleElement.Element,
  ): string[] => element.bases.map((base) => (
    rootNode == null
      ? '-'
      : DefinitionCatalog.resolveName(rootNode, base.styleId, new Set(['style'])) ?? '-'
  ))
}

export default StyleTreeLabelPresentation
