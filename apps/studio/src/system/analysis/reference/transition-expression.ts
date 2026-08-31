import TypeScript from 'typescript'
import ExpressionReferenceSyntax from './expression-reference-syntax'

namespace TransitionExpression {
  export type ArgumentProperty = {
    id: string
    nameNode: TypeScript.Node
    shorthand: boolean
  }

  export const getAccessor = (
    call: TypeScript.CallExpression,
  ): string | null => {
    const member = ExpressionReferenceSyntax.getMember(call.expression)
    return member?.root === '$transition' ? member.id : null
  }

  export const getArgumentProperties = (
    call: TypeScript.CallExpression,
  ): readonly ArgumentProperty[] => {
    const argument = call.arguments[0]
    if (argument == null || !TypeScript.isObjectLiteralExpression(argument)) return []

    return argument.properties.flatMap((property): ArgumentProperty[] => {
      if (TypeScript.isShorthandPropertyAssignment(property)) {
        return [{ id: property.name.text, nameNode: property.name, shorthand: true }]
      }
      if (!TypeScript.isPropertyAssignment(property)) return []
      const name = property.name
      if (TypeScript.isIdentifier(name) || TypeScript.isStringLiteral(name)) {
        return [{ id: name.text, nameNode: name, shorthand: false }]
      }
      if (
        TypeScript.isComputedPropertyName(name)
        && TypeScript.isStringLiteral(name.expression)
      ) {
        return [{ id: name.expression.text, nameNode: name.expression, shorthand: false }]
      }
      return []
    })
  }
}

export default TransitionExpression
