import TypeScript from 'typescript'
import RestrictedGlobals from './restricted-globals'

namespace ScriptPolicy {
  export type Options = {
    allowAwait?: boolean
    forbidReturn?: boolean
  }

  export const validate = (
    source: string,
    options: Options = {},
  ): string[] => {
    const file = TypeScript.createSourceFile(
      'mebaco-policy.ts',
      source,
      TypeScript.ScriptTarget.ES2022,
      true,
      TypeScript.ScriptKind.TS,
    )
    let hasAwait = false
    let hasReturn = false
    const restrictedGlobalMessages = new Set<string>()
    const restrictedGlobalNames = new Map(
      RestrictedGlobals.entries.map((entry) => [entry.name, entry.message]),
    )
    const isPropertyAccessName = (node: TypeScript.Identifier): boolean => (
      TypeScript.isPropertyAccessExpression(node.parent)
      && node.parent.name === node
    )
    const isPropertyAssignmentName = (node: TypeScript.Identifier): boolean => (
      TypeScript.isPropertyAssignment(node.parent)
      && node.parent.name === node
    )
    const isShorthandPropertyAssignmentName = (node: TypeScript.Identifier): boolean => (
      TypeScript.isShorthandPropertyAssignment(node.parent)
      && node.parent.name === node
    )
    const visit = (node: TypeScript.Node) => {
      hasAwait ||= TypeScript.isAwaitExpression(node)
      hasReturn ||= TypeScript.isReturnStatement(node)
      if (
        TypeScript.isIdentifier(node)
        && !isPropertyAccessName(node)
        && !isPropertyAssignmentName(node)
        && !isShorthandPropertyAssignmentName(node)
      ) {
        const message = restrictedGlobalNames.get(node.text)
        if (message != null) restrictedGlobalMessages.add(message)
      }
      TypeScript.forEachChild(node, visit)
    }
    visit(file)

    return [
      ...(options.allowAwait === true || !hasAwait
        ? []
        : ['await is only available in an async Function.']),
      ...(options.forbidReturn === true && hasReturn
        ? ['return is not allowed in an Action. Use the Function Return element.']
        : []),
      ...restrictedGlobalMessages,
    ]
  }
}

export default ScriptPolicy
