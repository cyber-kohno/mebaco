import type TreeNode from '../../../tree/tree-node'
import type ObjectTypeElement from './object/object-type-element'
import type UnionTypeElement from './union/union-type-element'
import type SignatureTypeElement from './signature/signature-type-element'
import type ObjectShape from './object/object-shape'
import TypeExpression from './type-expression'
import UnionDefinition from './union/union-definition'
import SignatureDefinition from './signature/signature-definition'
import TypeDefaultLabel from './type-default-label'
import TypeLiteralLabel from './type-literal-label'
import type ValueTypeDefinition from './value-type-definition'
import ContentHost from '../../content-host'
import ObjectPropertyTypeScriptMarker from './object/object-property-typescript-marker'

namespace TypeCatalog {
  export const typeScriptNamespace = '$type'

  export type ObjectEntry = {
    node: TreeNode.Node
    element: ObjectTypeElement.Element
  }

  export type UnionEntry = {
    node: TreeNode.Node
    element: UnionTypeElement.Element
  }

  export type SignatureEntry = {
    node: TreeNode.Node
    element: SignatureTypeElement.Element
  }

  export type NamedTypeEntry = ObjectEntry | UnionEntry | SignatureEntry

  export type Option = {
    value: string
    label: string
    literalValues?: readonly (string | number)[]
    name?: string
    detail?: string
    title?: string
    preview?: string
    kind?: 'union' | 'signature'
    defaultValueLabel?: string
  }

  export type ObjectOption = ObjectShape.ObjectOption

  export type TypeScriptDeclarationOptions = {
    includeObjectPropertyIdentityMarkers?: boolean
  }

  const findPath = (
    node: TreeNode.Node,
    targetNodeId: number,
    path: TreeNode.Node[] = [],
  ): TreeNode.Node[] | null => {
    const nextPath = [...path, node]
    if (node.id === targetNodeId) return nextPath
    for (const child of node.children) {
      const found = findPath(child, targetNodeId, nextPath)
      if (found != null) return found
    }
    return null
  }

  const collectObjects = (node: TreeNode.Node): ObjectEntry[] => {
    const entries: ObjectEntry[] = []
    const collect = (current: TreeNode.Node) => {
      if (current.element.kind === 'object-type') {
        entries.push({ node: current, element: current.element })
      }
      current.children.forEach(collect)
    }
    collect(node)
    return entries
  }

  const collectUnions = (node: TreeNode.Node): UnionEntry[] => {
    const entries: UnionEntry[] = []
    const collect = (current: TreeNode.Node) => {
      if (current.element.kind === 'union-type') {
        entries.push({ node: current, element: current.element })
      }
      current.children.forEach(collect)
    }
    collect(node)
    return entries
  }

  const collectSignatures = (node: TreeNode.Node): SignatureEntry[] => {
    const entries: SignatureEntry[] = []
    const collect = (current: TreeNode.Node) => {
      if (current.element.kind === 'signature-type') {
        entries.push({ node: current, element: current.element })
      }
      current.children.forEach(collect)
    }
    collect(node)
    return entries
  }

  const collectNamedTypes = (node: TreeNode.Node): NamedTypeEntry[] => [
    ...collectObjects(node),
    ...collectUnions(node),
    ...collectSignatures(node),
  ]

  const findCommonNode = (rootNode: TreeNode.Node): TreeNode.Node | null => (
    rootNode.children.find((node) => node.element.kind === 'common') ?? null
  )

  const findDirectChild = (
    node: TreeNode.Node,
    kind: TreeNode.Node['element']['kind'],
  ): TreeNode.Node | null => (
    node.children.find((child) => child.element.kind === kind) ?? null
  )

  const collectGlobalNamedTypes = (
    ownerNode: TreeNode.Node | null,
  ): NamedTypeEntry[] => {
    if (ownerNode == null) return []
    const declaresNode = findDirectChild(ownerNode, 'declares')
    const typesNode = declaresNode == null ? null : findDirectChild(declaresNode, 'types')
    const source = typesNode?.children ?? ownerNode.children
    const entries: NamedTypeEntry[] = []
    source.forEach((node) => {
      if (node.element.kind === 'object-type') {
        entries.push({ node, element: node.element })
      } else if (node.element.kind === 'union-type') {
        entries.push({ node, element: node.element })
      } else if (node.element.kind === 'signature-type') {
        entries.push({ node, element: node.element })
      }
    })
    return entries
  }

  const collectFrameNamedTypes = (
    frameNode: TreeNode.Node,
  ): NamedTypeEntry[] => {
    const entries: NamedTypeEntry[] = []
    const collect = (children: readonly TreeNode.Node[]) => {
      children.forEach((child) => {
        if (child.element.kind === 'object-type') {
          entries.push({ node: child, element: child.element })
        } else if (child.element.kind === 'union-type') {
          entries.push({ node: child, element: child.element })
        } else if (child.element.kind === 'signature-type') {
          entries.push({ node: child, element: child.element })
        } else if (child.element.kind === 'block') {
          collect(child.children)
        }
      })
    }
    collect(frameNode.children)
    return entries
  }

  const collectVisibleNamedTypesInternal = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): NamedTypeEntry[] => {
    const path = findPath(rootNode, targetNodeId) ?? []
    const ownerApp = [...path].reverse().find((node) => node.element.kind === 'app')
    const ownerCommon = [...path].reverse().find((node) => node.element.kind === 'common')
    const entries = new Map<string, NamedTypeEntry>()
    const add = (items: readonly NamedTypeEntry[]) => {
      items.forEach((entry) => entries.set(entry.element.typeId, entry))
    }

    add(collectGlobalNamedTypes(ownerCommon ?? findCommonNode(rootNode)))
    if (ownerApp != null) add(collectGlobalNamedTypes(ownerApp))
    if (ownerCommon == null && ownerApp == null && findCommonNode(rootNode) == null) {
      add(collectGlobalNamedTypes(rootNode))
    }

    path.forEach((node, index) => {
      if (
        node.element.kind === 'retention'
        || node.element.kind === 'function-procedure'
        || node.element.kind === 'promise-then'
        || node.element.kind === 'promise-catch'
      ) {
        add(collectFrameNamedTypes(node))
      }

      const nextNode = path[index + 1]
      const retentionNode = ContentHost.getRetentionNode(node)
      const elementsNode = ContentHost.getElementsNode(node)
      if (retentionNode != null && nextNode === elementsNode) {
        add(collectFrameNamedTypes(retentionNode))
      }
    })

    return [...entries.values()]
  }

  export const collectVisibleObjects = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): ObjectEntry[] => collectVisibleNamedTypesInternal(rootNode, targetNodeId)
    .filter((entry): entry is ObjectEntry => entry.element.kind === 'object-type')

  export const collectVisibleUnions = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): UnionEntry[] => collectVisibleNamedTypesInternal(rootNode, targetNodeId)
    .filter((entry): entry is UnionEntry => entry.element.kind === 'union-type')

  export const collectVisibleSignatures = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): SignatureEntry[] => collectVisibleNamedTypesInternal(rootNode, targetNodeId)
    .filter((entry): entry is SignatureEntry => entry.element.kind === 'signature-type')

  export const collectVisibleNamedTypes = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): NamedTypeEntry[] => collectVisibleNamedTypesInternal(rootNode, targetNodeId)

  export const findObject = (
    rootNode: TreeNode.Node,
    objectTypeId: string,
  ): ObjectEntry | null => (
    collectObjects(rootNode).find((entry) => entry.element.typeId === objectTypeId) ?? null
  )

  export const findUnion = (
    rootNode: TreeNode.Node,
    unionTypeId: string,
  ): UnionEntry | null => (
    collectUnions(rootNode).find((entry) => entry.element.typeId === unionTypeId) ?? null
  )

  export const getLiteralUnionValues = (
    rootNode: TreeNode.Node,
    unionTypeId: string,
  ): readonly (string | number)[] | null => {
    const entry = findUnion(rootNode, unionTypeId)
    return entry?.element.definition.type === 'literal'
      ? entry.element.definition.values
      : null
  }

  export const findSignature = (
    rootNode: TreeNode.Node,
    signatureTypeId: string,
  ): SignatureEntry | null => (
    collectSignatures(rootNode)
      .find((entry) => entry.element.typeId === signatureTypeId) ?? null
  )

  export const findNamedType = (
    rootNode: TreeNode.Node,
    typeId: string,
  ): NamedTypeEntry | null => (
    collectNamedTypes(rootNode).find((entry) => entry.element.typeId === typeId) ?? null
  )

  export const resolveTypeName = (
    rootNode: TreeNode.Node,
    typeId: string,
  ): string | undefined => findNamedType(rootNode, typeId)?.element.id

  export const toTypeScriptName = (
    typeName: string,
  ): string => `${typeScriptNamespace}.${typeName}`

  export const resolveTypeScriptName = (
    rootNode: TreeNode.Node,
    typeId: string,
  ): string | undefined => {
    const typeName = resolveTypeName(rootNode, typeId)
    return typeName == null ? undefined : toTypeScriptName(typeName)
  }

  export const getDefaultValueLabel = (
    rootNode: TreeNode.Node,
    definition: ValueTypeDefinition.Definition,
  ): string | undefined => TypeDefaultLabel.get(definition, {
    resolveObjectName: (objectTypeId) => findObject(rootNode, objectTypeId)?.element.id,
    resolveNamedType: (namedTypeId) => {
      const entry = findNamedType(rootNode, namedTypeId)
      if (entry?.element.kind === 'union-type') {
        return {
          kind: 'union',
          typeId: entry.element.typeId,
          name: entry.element.id,
          definition: entry.element.definition,
        }
      }
      if (entry?.element.kind === 'signature-type') {
        return {
          kind: 'signature',
          typeId: entry.element.typeId,
          name: entry.element.id,
          definition: {
            async: entry.element.async,
            parameters: entry.element.parameters,
            returnType: entry.element.returnType,
          },
        }
      }
      return undefined
    },
  })

  export const findOwnerObject = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): ObjectEntry | null => {
    const path = findPath(rootNode, targetNodeId) ?? []
    const ownerNode = [...path].reverse().find((node) => node.element.kind === 'object-type')
    return ownerNode?.element.kind === 'object-type'
      ? { node: ownerNode, element: ownerNode.element }
      : null
  }

  const collectReferencedObjectIds = (
    properties: readonly TypeExpression.Property[],
  ): string[] => {
    const ids: string[] = []
    const collect = (level: readonly TypeExpression.Property[]) => {
      level.forEach((property) => {
        const { base } = TypeExpression.unwrapArray(property.valueType)
        if (base.type === 'reference') ids.push(...base.objectTypeIds)
        if (base.type === 'object') collect(base.properties)
      })
    }
    collect(properties)
    return ids
  }

  const collectObjectDependencies = (
    element: ObjectTypeElement.Element,
  ): string[] => [
    ...element.baseObjectIds,
    ...collectReferencedObjectIds(element.properties),
  ]

  const containsReference = (
    properties: readonly TypeExpression.Property[],
    objectTypeId: string,
  ): boolean => {
    for (const property of properties) {
      const { base } = TypeExpression.unwrapArray(property.valueType)
      if (base.type === 'reference' && base.objectTypeIds.includes(objectTypeId)) return true
      if (base.type === 'object' && containsReference(base.properties, objectTypeId)) {
        return true
      }
    }
    return false
  }

  export const wouldCreateCycle = (
    rootNode: TreeNode.Node,
    ownerObjectTypeId: string,
    referencedObjectTypeId: string,
  ): boolean => {
    if (ownerObjectTypeId === referencedObjectTypeId) return true

    const visited = new Set<string>()
    const reachesOwner = (objectTypeId: string): boolean => {
      if (objectTypeId === ownerObjectTypeId) return true
      if (visited.has(objectTypeId)) return false
      visited.add(objectTypeId)

      const entry = findObject(rootNode, objectTypeId)
      return entry == null
        ? false
        : collectObjectDependencies(entry.element).some(reachesOwner)
    }

    return reachesOwner(referencedObjectTypeId)
  }

  export const getObjectOptions = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): ObjectOption[] => {
    const owner = findOwnerObject(rootNode, targetNodeId)
    return collectVisibleObjects(rootNode, targetNodeId)
      .filter((entry) => (
        owner == null
        || !wouldCreateCycle(rootNode, owner.element.typeId, entry.element.typeId)
      ))
      .map((entry) => ({
        value: entry.element.typeId,
        label: entry.element.id,
        baseObjectIds: entry.element.baseObjectIds,
        properties: entry.element.properties,
      }))
      .sort((left, right) => left.label.localeCompare(right.label))
  }

  export const getReferenceOptions = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): Option[] => getObjectOptions(rootNode, targetNodeId)

  export const getNamedTypeOptions = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
  ): Option[] => [
    ...collectVisibleUnions(rootNode, targetNodeId).map((entry): Option => {
      const detail = entry.element.definition.type === 'literal'
        ? `Literal Union (${entry.element.definition.valueType})`
        : 'Object Union'
      return {
        value: entry.element.typeId,
        name: entry.element.id,
        detail,
        title: UnionDefinition.getTypeScriptType(
          entry.element.definition,
          (objectTypeId) => findObject(rootNode, objectTypeId)?.element.id,
        ),
        label: entry.element.id,
        kind: 'union',
        defaultValueLabel: getDefaultValueLabel(rootNode, {
          valueType: TypeExpression.createNamed(entry.element.typeId, 'union'),
          nullable: false,
        }),
        literalValues: entry.element.definition.type === 'literal'
          ? entry.element.definition.values
          : undefined,
      }
    }),
    ...collectVisibleSignatures(rootNode, targetNodeId).map((entry): Option => {
      const preview = SignatureDefinition.getTypeText({
        async: entry.element.async,
        parameters: entry.element.parameters,
        returnType: entry.element.returnType,
      }, (typeId) => resolveTypeName(rootNode, typeId))
      return {
        value: entry.element.typeId,
        name: entry.element.id,
        title: preview,
        preview,
        label: entry.element.id,
        kind: 'signature',
        defaultValueLabel: getDefaultValueLabel(rootNode, {
          valueType: TypeExpression.createNamed(entry.element.typeId, 'signature'),
          nullable: false,
        }),
      }
    }),
  ]
    .sort((left, right) => (left.name ?? left.label).localeCompare(right.name ?? right.label))

  export const getCommonNamedTypeOptions = (
    rootNode: TreeNode.Node,
  ): Option[] => {
    const commonNode = findCommonNode(rootNode)
    return commonNode == null
      ? []
      : getNamedTypeOptions(rootNode, commonNode.id)
  }

  export const isObjectReferenced = (
    rootNode: TreeNode.Node,
    objectTypeId: string,
  ): boolean => {
    let referenced = false
    const visit = (node: TreeNode.Node) => {
      if (node.element.kind === 'object-type') {
        referenced ||= (
          node.element.baseObjectIds.includes(objectTypeId)
          || containsReference(node.element.properties, objectTypeId)
        )
      }
      if (
        node.element.kind === 'union-type'
        && node.element.definition.type === 'object'
      ) {
        referenced ||= node.element.definition.objectTypeIds.includes(objectTypeId)
      }
      if (node.element.kind === 'signature-type') {
        referenced ||= node.element.parameters.some((parameter) => (
          TypeExpression.getReferenceIds(parameter.valueType).includes(objectTypeId)
        ))
        if (node.element.returnType != null) {
          referenced ||= TypeExpression.getReferenceIds(
            node.element.returnType.valueType,
          ).includes(objectTypeId)
        }
      }
      if (node.element.kind === 'state') {
        referenced ||= TypeExpression.getReferenceIds(node.element.valueType).includes(objectTypeId)
      }
      if (
        node.element.kind === 'function'
        && node.element.signature.mode === 'inline'
      ) {
        referenced ||= node.element.signature.definition.parameters.some((parameter) => (
          TypeExpression.getReferenceIds(parameter.valueType).includes(objectTypeId)
        ))
        if (node.element.signature.definition.returnType != null) {
          referenced ||= TypeExpression.getReferenceIds(
            node.element.signature.definition.returnType.valueType,
          ).includes(objectTypeId)
        }
      }
      if (
        node.element.kind === 'variable'
        && node.element.typeSetting.type === 'explicit'
      ) {
        referenced ||= TypeExpression.getReferenceIds(
          node.element.typeSetting.valueType,
        ).includes(objectTypeId)
      }
      if (!referenced) node.children.forEach(visit)
    }
    visit(rootNode)
    return referenced
  }

  const isNamedTypeReferenced = (
    rootNode: TreeNode.Node,
    namedTypeId: string,
  ): boolean => {
    let referenced = false
    const visit = (node: TreeNode.Node) => {
      if (node.element.kind === 'object-type') {
        referenced ||= node.element.properties.some((property) => (
          TypeExpression.getNamedTypeIds(property.valueType).includes(namedTypeId)
        ))
      }
      if (node.element.kind === 'state') {
        referenced ||= TypeExpression.getNamedTypeIds(node.element.valueType).includes(namedTypeId)
      }
      if (node.element.kind === 'value-prop') {
        referenced ||= TypeExpression.getNamedTypeIds(node.element.valueType).includes(namedTypeId)
      }
      if (node.element.kind === 'signature-type') {
        referenced ||= node.element.parameters.some((parameter) => (
          TypeExpression.getNamedTypeIds(parameter.valueType).includes(namedTypeId)
        ))
        if (node.element.returnType != null) {
          referenced ||= TypeExpression.getNamedTypeIds(
            node.element.returnType.valueType,
          ).includes(namedTypeId)
        }
      }
      if (node.element.kind === 'launch-argument') {
        referenced ||= TypeExpression.getNamedTypeIds(node.element.valueType).includes(namedTypeId)
      }
      if (node.element.kind === 'function' && node.element.signature.mode === 'refer') {
        referenced ||= node.element.signature.signatureTypeId === namedTypeId
      }
      if (
        node.element.kind === 'function'
        && node.element.signature.mode === 'inline'
      ) {
        referenced ||= node.element.signature.definition.parameters.some((parameter) => (
          TypeExpression.getNamedTypeIds(parameter.valueType).includes(namedTypeId)
        ))
        if (node.element.signature.definition.returnType != null) {
          referenced ||= TypeExpression.getNamedTypeIds(
            node.element.signature.definition.returnType.valueType,
          ).includes(namedTypeId)
        }
      }
      if (
        node.element.kind === 'variable'
        && node.element.typeSetting.type === 'explicit'
      ) {
        referenced ||= TypeExpression.getNamedTypeIds(
          node.element.typeSetting.valueType,
        ).includes(namedTypeId)
      }
      if (!referenced) node.children.forEach(visit)
    }
    visit(rootNode)
    return referenced
  }

  export const isUnionReferenced = (
    rootNode: TreeNode.Node,
    unionTypeId: string,
  ): boolean => isNamedTypeReferenced(rootNode, unionTypeId)

  export const isSignatureReferenced = (
    rootNode: TreeNode.Node,
    signatureTypeId: string,
  ): boolean => isNamedTypeReferenced(rootNode, signatureTypeId)

  const createDefaultValue = (
    rootNode: TreeNode.Node,
    valueType: TypeExpression.Expression,
    visiting: ReadonlySet<string>,
  ): unknown => {
    const { base, depth } = TypeExpression.unwrapArray(valueType)
    if (depth > 0) return []

    switch (base.type) {
      case 'string':
        return base.literals?.[0] ?? ''
      case 'number':
        return base.literals?.[0] ?? 0
      case 'boolean':
        return false
      case 'object':
        return createDefaultProperties(rootNode, base.properties, visiting)
      case 'reference':
        return createDefaultObjectRec(rootNode, base.objectTypeIds[0] ?? '', visiting)
      case 'named':
        return createDefaultNamedTypeRec(rootNode, base.namedTypeId, visiting)
    }
  }

  const defaultSignatureCache = new WeakMap<
    TreeNode.Node,
    Map<string, {
      signature: SignatureEntry['element']
      value: (...args: unknown[]) => unknown
    }>
  >()

  const createDefaultSignature = (
    rootNode: TreeNode.Node,
    signature: SignatureEntry['element'],
  ): ((...args: unknown[]) => unknown) => {
    let projectCache = defaultSignatureCache.get(rootNode)
    if (projectCache == null) {
      projectCache = new Map()
      defaultSignatureCache.set(rootNode, projectCache)
    }
    const cached = projectCache.get(signature.typeId)
    if (cached?.signature === signature) return cached.value

    const createReturnValue = (): unknown => {
      if (signature.returnType == null) return undefined
      if (signature.returnType.nullable) return null
      return createDefaultValue(rootNode, signature.returnType.valueType, new Set())
    }

    const value = signature.async
      ? async (..._args: unknown[]) => createReturnValue()
      : (..._args: unknown[]) => createReturnValue()
    projectCache.set(signature.typeId, { signature, value })
    return value
  }

  const createDefaultNamedTypeRec = (
    rootNode: TreeNode.Node,
    namedTypeId: string,
    visiting: ReadonlySet<string>,
  ): unknown => {
    const entry = findNamedType(rootNode, namedTypeId)
    if (entry == null) return undefined
    if (entry.element.kind === 'signature-type') {
      return createDefaultSignature(rootNode, entry.element)
    }
    if (entry.element.kind !== 'union-type') return undefined
    if (entry.element.definition.type === 'literal') {
      return entry.element.definition.values[0] ?? (
        entry.element.definition.valueType === 'number' ? 0 : ''
      )
    }
    return createDefaultObjectRec(
      rootNode,
      entry.element.definition.objectTypeIds[0] ?? '',
      visiting,
    )
  }

  const createDefaultProperties = (
    rootNode: TreeNode.Node,
    properties: readonly TypeExpression.Property[],
    visiting: ReadonlySet<string>,
  ): Record<string, unknown> => Object.fromEntries(
    properties
      .filter((property) => !property.optional)
      .map((property) => [
        property.id,
        property.nullable
          ? null
          : createDefaultValue(rootNode, property.valueType, visiting),
      ]),
  )

  const createDefaultObjectRec = (
    rootNode: TreeNode.Node,
    objectTypeId: string,
    visiting: ReadonlySet<string>,
  ): Record<string, unknown> => {
    if (visiting.has(objectTypeId)) return {}
    const entry = findObject(rootNode, objectTypeId)
    if (entry == null) return {}

    const nextVisiting = new Set([...visiting, objectTypeId])
    const inherited = entry.element.baseObjectIds.map((baseObjectId) => (
      createDefaultObjectRec(rootNode, baseObjectId, nextVisiting)
    ))

    return Object.assign(
      {},
      ...inherited,
      createDefaultProperties(rootNode, entry.element.properties, nextVisiting),
    )
  }

  export const createDefaultObject = (
    rootNode: TreeNode.Node,
    objectTypeId: string,
  ): Record<string, unknown> => createDefaultObjectRec(rootNode, objectTypeId, new Set())

  export const createDefaultNamedType = (
    rootNode: TreeNode.Node,
    namedTypeId: string,
  ): unknown => createDefaultNamedTypeRec(rootNode, namedTypeId, new Set())

  const getTypeScriptType = (
    rootNode: TreeNode.Node,
    valueType: TypeExpression.Expression,
    options: TypeScriptDeclarationOptions,
  ): string => {
    const { base, depth } = TypeExpression.unwrapArray(valueType)
    let baseText: string

    switch (base.type) {
      case 'string':
        baseText = base.literals == null
          ? 'string'
          : base.literals.map(TypeLiteralLabel.format).join(' | ')
        break
      case 'number':
        baseText = base.literals == null
          ? 'number'
          : base.literals.join(' | ')
        break
      case 'boolean':
        baseText = base.type
        break
      case 'reference':
        baseText = base.objectTypeIds
          .map((objectTypeId) => resolveTypeScriptName(rootNode, objectTypeId) ?? 'unknown')
          .join(' | ')
        break
      case 'named':
        baseText = resolveTypeScriptName(rootNode, base.namedTypeId) ?? 'unknown'
        break
      case 'object': {
        const fields = base.properties
          .map((property) => getTypeScriptProperty(rootNode, property, options))
        baseText = `{ ${fields.join(' ')} }`
        break
      }
    }

    const isUnion = baseText.includes(' | ')
    return `${depth > 0 && isUnion ? `(${baseText})` : baseText}${'[]'.repeat(depth)}`
  }

  const getTypeScriptProperty = (
    rootNode: TreeNode.Node,
    property: TypeExpression.Property,
    options: TypeScriptDeclarationOptions,
  ): string => {
    const valueType = getTypeScriptType(rootNode, property.valueType, options)
    const marker = options.includeObjectPropertyIdentityMarkers === true
      ? ObjectPropertyTypeScriptMarker.create(property.propertyId)
      : ''
    return `${marker}${property.id}${property.optional ? '?' : ''}: ${valueType}${property.nullable ? ' | null' : ''};`
  }

  export const createTypeScriptDeclarations = (
    rootNode: TreeNode.Node,
    targetNodeId: number,
    options: TypeScriptDeclarationOptions = {},
  ): string => {
    const entries = collectVisibleNamedTypes(rootNode, targetNodeId)
    if (entries.length === 0) return ''

    const names = new Set<string>()
    entries.forEach((entry) => {
      if (names.has(entry.element.id)) {
        throw new Error(
          `Duplicate Type ID '${entry.element.id}' in the visible ${typeScriptNamespace} namespace.`,
        )
      }
      names.add(entry.element.id)
    })

    const declarations = entries.map((entry) => {
      if (entry.element.kind === 'union-type') {
        return `export type ${entry.element.id} = ${UnionDefinition.getTypeScriptType(
          entry.element.definition,
          (objectTypeId) => resolveTypeScriptName(rootNode, objectTypeId),
        )}`
      }

      if (entry.element.kind === 'signature-type') {
        return `export type ${entry.element.id} = ${SignatureDefinition.getTypeText(
          {
            async: entry.element.async,
            parameters: entry.element.parameters,
            returnType: entry.element.returnType,
          },
          (typeId) => resolveTypeScriptName(rootNode, typeId),
        )}`
      }

      const fields = entry.element.properties
        .map((property) => `  ${getTypeScriptProperty(rootNode, property, options)}`)
      const bases = entry.element.baseObjectIds
        .map((objectTypeId) => resolveTypeScriptName(rootNode, objectTypeId) ?? 'unknown')
      const baseExpression = bases.length === 0 ? '' : `${bases.join(' & ')} & `
      return [`export type ${entry.element.id} = ${baseExpression}{`, ...fields, '}'].join('\n')
    })

    return [
      `declare namespace ${typeScriptNamespace} {`,
      ...declarations.flatMap((declaration, index) => [
        ...(index === 0 ? [] : ['']),
        ...declaration.split('\n').map((line) => `  ${line}`),
      ]),
      '}',
    ].join('\n')
  }
}

export default TypeCatalog
