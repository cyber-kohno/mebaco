import type TreeNode from '../../tree/tree-node'

namespace ProcedureStructureVerifier {
  const verifySequence = (
    parentNode: TreeNode.Node,
    messages: string[],
    insidePromiseBranch = false,
  ) => {
    let precedingReturn: TreeNode.Node | null = null

    for (const child of parentNode.children) {
      if (child.disabled) continue
      if (precedingReturn != null) {
        messages.push(
          `node-${child.id} is unreachable because it follows Return node-${precedingReturn.id}.`,
        )
        continue
      }
      if (child.element.kind === 'function-return') {
        if (insidePromiseBranch) {
          messages.push(
            `Return node-${child.id} is not allowed inside a Promise Then or Catch branch.`,
          )
        }
        precedingReturn = child
        continue
      }

      if (child.element.kind === 'promise') {
        const thenNodes = child.children.filter(
          (branch) => branch.element.kind === 'promise-then',
        )
        const catchNodes = child.children.filter(
          (branch) => branch.element.kind === 'promise-catch',
        )
        const invalidNodes = child.children.filter((branch) => (
          branch.element.kind !== 'promise-then'
          && branch.element.kind !== 'promise-catch'
        ))
        if (thenNodes.length !== 1) {
          messages.push(`Promise node-${child.id} must contain exactly one Then branch.`)
        }
        if (catchNodes.length > 1) {
          messages.push(`Promise node-${child.id} can contain at most one Catch branch.`)
        }
        if (invalidNodes.length > 0) {
          messages.push(`Promise node-${child.id} contains an invalid branch.`)
        }
        const thenIndex = child.children.findIndex(
          (branch) => branch.element.kind === 'promise-then',
        )
        const catchIndex = child.children.findIndex(
          (branch) => branch.element.kind === 'promise-catch',
        )
        if (catchIndex >= 0 && thenIndex >= 0 && catchIndex < thenIndex) {
          messages.push(`Promise node-${child.id} Catch must follow Then.`)
        }
      }

      // A nested Function owns a separate execution flow. Other containers
      // (branches and Blocks) remain part of this Procedure's flow.
      if (
        child.element.kind !== 'function'
        && child.element.kind !== 'function-procedure'
      ) {
        verifySequence(
          child,
          messages,
          insidePromiseBranch
            || child.element.kind === 'promise-then'
            || child.element.kind === 'promise-catch',
        )
      }
    }
  }

  export const verify = (node: TreeNode.Node): readonly string[] => {
    if (node.element.kind !== 'function-procedure') return []
    const messages: string[] = []
    verifySequence(node, messages)
    return messages
  }
}

export default ProcedureStructureVerifier
