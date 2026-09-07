import DefinitionCatalog from '../../../definition-catalog'
import type TreeNode from '../../../../tree/tree-node'
import type StyleElement from './style-element'

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
