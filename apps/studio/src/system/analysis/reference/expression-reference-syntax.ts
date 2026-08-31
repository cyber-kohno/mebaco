import TypeScript from 'typescript'

namespace ExpressionReferenceSyntax {
  export type Member = {
    root: string
    id: string
    nameNode: TypeScript.Node
    quote: '' | "'" | '"'
  }

  export const getMember = (
    node: TypeScript.Node,
  ): Member | null => {
    if (
      TypeScript.isQualifiedName(node)
      && TypeScript.isIdentifier(node.left)
    ) {
      return {
        root: node.left.text,
        id: node.right.text,
        nameNode: node.right,
        quote: '',
      }
    }
    if (
      TypeScript.isPropertyAccessExpression(node)
      && TypeScript.isIdentifier(node.expression)
    ) {
      return {
        root: node.expression.text,
        id: node.name.text,
        nameNode: node.name,
        quote: '',
      }
    }
    if (
      TypeScript.isElementAccessExpression(node)
      && TypeScript.isIdentifier(node.expression)
      && node.argumentExpression != null
      && TypeScript.isStringLiteral(node.argumentExpression)
    ) {
      const literal = node.argumentExpression
      return {
        root: node.expression.text,
        id: literal.text,
        nameNode: literal,
        quote: literal.getText().startsWith("'") ? "'" : '"',
      }
    }
    return null
  }

  export const createNameReplacement = (
    member: Member,
    nextId: string,
  ): string => member.quote.length === 0
    ? nextId
    : `${member.quote}${nextId}${member.quote}`
}

export default ExpressionReferenceSyntax
