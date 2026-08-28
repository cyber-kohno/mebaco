import type TreeNode from '../../../tree/tree-node'
import TypeCatalog from './type-catalog'
import TypeExpression from './type-expression'

namespace TypeDefaultExpression {
  type Signature = TypeCatalog.SignatureEntry['element']

  type Context = {
    rootNode: TreeNode.Node
    signatures: Map<string, { variable: string; signature: Signature }>
  }

  const fail = (message: string): never => {
    throw new Error(`Cannot create a type default expression: ${message}`)
  }

  const collectObject = (
    context: Context,
    objectTypeId: string,
    visiting: ReadonlySet<string>,
  ) => {
    if (visiting.has(objectTypeId)) return
    const entry = TypeCatalog.findObject(context.rootNode, objectTypeId)
      ?? fail(`Object '${objectTypeId}' was not found.`)
    const nextVisiting = new Set([...visiting, objectTypeId])
    entry.element.baseObjectIds.forEach((baseObjectId) => (
      collectObject(context, baseObjectId, nextVisiting)
    ))
    entry.element.properties.forEach((property) => {
      if (!property.optional) collect(context, property.valueType, property.nullable, nextVisiting)
    })
  }

  const collect = (
    context: Context,
    valueType: TypeExpression.Expression,
    nullable: boolean,
    visitingObjects: ReadonlySet<string> = new Set(),
  ) => {
    if (nullable) return
    const { base, depth } = TypeExpression.unwrapArray(valueType)
    if (depth > 0) return

    if (base.type === 'object') {
      base.properties.forEach((property) => {
        if (!property.optional) collect(
          context,
          property.valueType,
          property.nullable,
          visitingObjects,
        )
      })
      return
    }
    if (base.type === 'reference') {
      collectObject(
        context,
        base.objectTypeIds[0] ?? fail('No Object is selected.'),
        visitingObjects,
      )
      return
    }
    if (base.type !== 'named') return

    const entry = TypeCatalog.findNamedType(context.rootNode, base.namedTypeId)
      ?? fail(`Named Type '${base.namedTypeId}' was not found.`)
    if (entry.element.kind === 'signature-type') {
      if (context.signatures.has(entry.element.typeId)) return
      const variable = `__mebacoDefaultSignature${context.signatures.size}`
      context.signatures.set(entry.element.typeId, { variable, signature: entry.element })
      if (entry.element.returnType != null) {
        collect(
          context,
          entry.element.returnType.valueType,
          entry.element.returnType.nullable,
          visitingObjects,
        )
      }
      return
    }
    if (entry.element.kind !== 'union-type' || entry.element.definition.type === 'literal') return
    collectObject(
      context,
      entry.element.definition.objectTypeIds[0] ?? fail('The Union has no Object.'),
      visitingObjects,
    )
  }

  const createPropertiesExpression = (
    context: Context,
    properties: readonly TypeExpression.Property[],
    visitingObjects: ReadonlySet<string>,
  ): string => {
    const fields = properties
      .filter((property) => !property.optional)
      .map((property) => (
        `${JSON.stringify(property.id)}: ${createValueExpression(
          context,
          property.valueType,
          property.nullable,
          visitingObjects,
        )}`
      ))
    return fields.length === 0 ? '{}' : `{ ${fields.join(', ')} }`
  }

  const createObjectExpression = (
    context: Context,
    objectTypeId: string,
    visiting: ReadonlySet<string>,
  ): string => {
    if (visiting.has(objectTypeId)) return '{}'
    const entry = TypeCatalog.findObject(context.rootNode, objectTypeId)
      ?? fail(`Object '${objectTypeId}' was not found.`)
    const nextVisiting = new Set([...visiting, objectTypeId])
    const bases = entry.element.baseObjectIds.map((baseObjectId) => (
      createObjectExpression(context, baseObjectId, nextVisiting)
    ))
    const own = createPropertiesExpression(context, entry.element.properties, nextVisiting)
    if (bases.length === 0) return own
    return `{ ${[...bases.map((base) => `...(${base})`), `...(${own})`].join(', ')} }`
  }

  const createValueExpression = (
    context: Context,
    valueType: TypeExpression.Expression,
    nullable: boolean,
    visitingObjects: ReadonlySet<string> = new Set(),
  ): string => {
    if (nullable) return 'null'
    const { base, depth } = TypeExpression.unwrapArray(valueType)
    if (depth > 0) return '[]'

    switch (base.type) {
      case 'string':
        return JSON.stringify(base.literals?.[0] ?? '')
      case 'number':
        return String(base.literals?.[0] ?? 0)
      case 'boolean':
        return 'false'
      case 'object':
        return createPropertiesExpression(context, base.properties, visitingObjects)
      case 'reference':
        return createObjectExpression(
          context,
          base.objectTypeIds[0] ?? fail('No Object is selected.'),
          visitingObjects,
        )
      case 'named': {
        const entry = TypeCatalog.findNamedType(context.rootNode, base.namedTypeId)
          ?? fail(`Named Type '${base.namedTypeId}' was not found.`)
        if (entry.element.kind === 'signature-type') {
          return context.signatures.get(entry.element.typeId)?.variable
            ?? fail(`Signature '${entry.element.id}' was not collected.`)
        }
        if (entry.element.kind !== 'union-type') {
          return fail(`Named Type '${base.namedTypeId}' is unsupported.`)
        }
        if (entry.element.definition.type === 'literal') {
          const value = entry.element.definition.values[0]
            ?? (entry.element.definition.valueType === 'number' ? 0 : '')
          return JSON.stringify(value)
        }
        return createObjectExpression(
          context,
          entry.element.definition.objectTypeIds[0]
            ?? fail(`Union '${entry.element.id}' has no Object.`),
          visitingObjects,
        )
      }
    }
  }

  const createSignatureExpression = (
    context: Context,
    signature: Signature,
  ): string => {
    const parameters = signature.parameters
      .map((parameter) => `_${parameter.id}: unknown`)
      .join(', ')
    const prefix = signature.async ? 'async ' : ''
    if (signature.returnType == null) return `${prefix}(${parameters}) => {}`
    return `${prefix}(${parameters}) => ${createValueExpression(
      context,
      signature.returnType.valueType,
      signature.returnType.nullable,
    )}`
  }

  export const create = (
    rootNode: TreeNode.Node,
    valueType: TypeExpression.Expression,
    nullable = false,
  ): string => {
    const context: Context = { rootNode, signatures: new Map() }
    collect(context, valueType, nullable)
    const valueExpression = createValueExpression(context, valueType, nullable)
    if (context.signatures.size === 0) return valueExpression

    const declarations = [...context.signatures.values()].map(({ variable, signature }) => (
      `  const ${variable}: any = ${createSignatureExpression(context, signature)}`
    ))
    return [
      '(() => {',
      ...declarations,
      `  return ${valueExpression}`,
      '})()',
    ].join('\n')
  }
}

export default TypeDefaultExpression
