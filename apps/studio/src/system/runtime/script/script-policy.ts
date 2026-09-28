import TypeScript from 'typescript'
import RestrictedGlobals from './restricted-globals'

namespace ScriptPolicy {
  export type Options = {
    allowAwait?: boolean
    allowVoidReturn?: boolean
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
    let hasValueReturn = false
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
    const isFunctionLike = (node: TypeScript.Node): boolean => (
      TypeScript.isFunctionDeclaration(node)
      || TypeScript.isFunctionExpression(node)
      || TypeScript.isArrowFunction(node)
      || TypeScript.isMethodDeclaration(node)
      || TypeScript.isGetAccessorDeclaration(node)
      || TypeScript.isSetAccessorDeclaration(node)
      || TypeScript.isConstructorDeclaration(node)
    )
    const visit = (node: TypeScript.Node, insideNestedFunction = false) => {
      hasAwait ||= TypeScript.isAwaitExpression(node)
      if (!insideNestedFunction && TypeScript.isReturnStatement(node)) {
        hasReturn = true
        hasValueReturn ||= node.expression != null
      }
      if (
        TypeScript.isIdentifier(node)
        && !isPropertyAccessName(node)
        && !isPropertyAssignmentName(node)
        && !isShorthandPropertyAssignmentName(node)
      ) {
        const message = restrictedGlobalNames.get(node.text)
        if (message != null) restrictedGlobalMessages.add(message)
      }
      const childInsideNestedFunction = insideNestedFunction || isFunctionLike(node)
      TypeScript.forEachChild(node, (child) => visit(child, childInsideNestedFunction))
    }
    visit(file)

    return [
      ...(options.allowAwait === true || !hasAwait
        ? []
        : ['await is only available in an async Function.']),
      ...(options.forbidReturn === true
        && (hasValueReturn || (hasReturn && options.allowVoidReturn !== true))
        ? [hasValueReturn
          ? 'A value-returning return is not allowed in an Action. Use return; to exit the current Action, or the Function Return element to return from the enclosing Function.'
          : 'return is not allowed in an Action. Use the Function Return element.']
        : []),
      ...restrictedGlobalMessages,
    ]
  }
}

export default ScriptPolicy
