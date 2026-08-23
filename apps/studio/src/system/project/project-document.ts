import type TreeNode from '../tree/tree-node'

namespace ProjectDocument {
  /**
   * The tree contains editor-only state alongside the project definition.
   * Keep that state out of the document fingerprint so opening/closing a node
   * does not make the project dirty.
   */
  const normalizeNode = (node: TreeNode.Node): unknown => ({
    element: node.element,
    ...(node.disabled === true ? { disabled: true } : {}),
    children: node.children.map(normalizeNode),
  })

  const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== 'object') {
      return JSON.stringify(value) ?? 'null'
    }

    if (Array.isArray(value)) {
      return `[${value.map(stableStringify).join(',')}]`
    }

    const entries = Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))

    return `{${entries
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(',')}}`
  }

  export const createFingerprint = (rootNode: TreeNode.Node): string => (
    stableStringify(normalizeNode(rootNode))
  )
}

export default ProjectDocument
