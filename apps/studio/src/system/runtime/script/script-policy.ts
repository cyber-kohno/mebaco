import TypeScript from 'typescript'

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
    const visit = (node: TypeScript.Node) => {
      hasAwait ||= TypeScript.isAwaitExpression(node)
      hasReturn ||= TypeScript.isReturnStatement(node)
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
    ]
  }
}

export default ScriptPolicy
