import type TreeNode from '../../../../tree/tree-node'
import TypeExpression from '../type-expression'
import TypeCatalog from '../type-catalog'
import type ObjectTypeElement from './object-type-element'
import ObjectInheritance from './object-inheritance'

namespace ObjectDefinitionUpdatePolicy {
  export type PropertyChange = {
    propertyId: string
    previousPath?: string
    currentPath?: string
  }

  export type Analysis = {
    added: readonly PropertyChange[]
    removed: readonly PropertyChange[]
    updated: readonly PropertyChange[]
    renamed: readonly PropertyChange[]
    effectiveAddedPaths: readonly string[]
    effectiveRemovedPaths: readonly string[]
    effectiveUpdatedPaths: readonly string[]
    effectiveShapeChanged: boolean
    notices: readonly string[]
  }

  export class PropertyNameReuseError extends Error {
    constructor(
      readonly path: string,
      readonly previousPropertyId: string,
      readonly currentPropertyId: string,
    ) {
      super(`Object Property '${path}' cannot be assigned to a different Property identity in the same update.`)
      this.name = 'PropertyNameReuseError'
    }
  }

  const getBase = (property: TypeExpression.Property): TypeExpression.Base => (
    TypeExpression.unwrapArray(property.valueType).base
  )

  const getInlineProperties = (
    property: TypeExpression.Property,
  ): readonly TypeExpression.Property[] => {
    const base = getBase(property)
    return base.type === 'object' ? base.properties : []
  }

  const createPath = (parentPath: string, id: string): string => (
    parentPath.length === 0 ? id : `${parentPath}.${id}`
  )

  const normalizeExpression = (
    expression: TypeExpression.Expression,
    includeInlineProperties: boolean,
  ): unknown => {
    if (expression.type === 'array') {
      return {
        type: 'array',
        item: normalizeExpression(expression.item, includeInlineProperties),
      }
    }
    if (expression.type === 'object') {
      return includeInlineProperties
        ? {
            type: 'object',
            properties: expression.properties
              .map((property) => ({
                id: property.id,
                optional: property.optional,
                nullable: property.nullable,
                valueType: normalizeExpression(property.valueType, true),
              }))
              .sort((left, right) => left.id.localeCompare(right.id)),
          }
        : { type: 'object' }
    }
    if (expression.type === 'reference') {
      return { type: 'reference', objectTypeIds: expression.objectTypeIds }
    }
    if (expression.type === 'named') {
      return {
        type: 'named',
        namedTypeId: expression.namedTypeId,
        namedTypeKind: expression.namedTypeKind,
      }
    }
    if (expression.type === 'string' || expression.type === 'number') {
      return { type: expression.type, literals: expression.literals }
    }
    return { type: expression.type }
  }

  const getMemberFingerprint = (
    property: TypeExpression.Property,
  ): string => JSON.stringify({
    optional: property.optional,
    nullable: property.nullable,
    valueType: normalizeExpression(property.valueType, false),
  })

  type DirectChanges = {
    added: PropertyChange[]
    removed: PropertyChange[]
    updated: PropertyChange[]
    renamed: PropertyChange[]
  }

  const collectAdded = (
    property: TypeExpression.Property,
    parentPath: string,
    result: DirectChanges,
  ): void => {
    const currentPath = createPath(parentPath, property.id)
    result.added.push({ propertyId: property.propertyId, currentPath })
    getInlineProperties(property).forEach((child) => collectAdded(child, currentPath, result))
  }

  const collectRemoved = (
    property: TypeExpression.Property,
    parentPath: string,
    result: DirectChanges,
  ): void => {
    const previousPath = createPath(parentPath, property.id)
    result.removed.push({ propertyId: property.propertyId, previousPath })
    getInlineProperties(property).forEach((child) => collectRemoved(child, previousPath, result))
  }

  const collectDirectChanges = (
    previous: readonly TypeExpression.Property[],
    current: readonly TypeExpression.Property[],
    previousParentPath: string,
    currentParentPath: string,
    result: DirectChanges,
  ): void => {
    const previousByName = new Map(previous.map((property) => [property.id, property]))
    current.forEach((property) => {
      const previousOwner = previousByName.get(property.id)
      if (previousOwner != null && previousOwner.propertyId !== property.propertyId) {
        throw new PropertyNameReuseError(
          createPath(currentParentPath, property.id),
          previousOwner.propertyId,
          property.propertyId,
        )
      }
    })

    const diff = TypeExpression.diffProperties(previous, current)
    diff.added.forEach(({ member }) => collectAdded(member, currentParentPath, result))
    diff.removed.forEach(({ member }) => collectRemoved(member, previousParentPath, result))
    diff.updated.forEach(({ previous: before, current: after }) => {
      const previousPath = createPath(previousParentPath, before.id)
      const currentPath = createPath(currentParentPath, after.id)
      if (before.id !== after.id) {
        result.renamed.push({
          propertyId: before.propertyId,
          previousPath,
          currentPath,
        })
      }
      if (getMemberFingerprint(before) !== getMemberFingerprint(after)) {
        result.updated.push({
          propertyId: before.propertyId,
          previousPath,
          currentPath,
        })
      }

      const previousChildren = getInlineProperties(before)
      const currentChildren = getInlineProperties(after)
      if (previousChildren.length > 0 || currentChildren.length > 0) {
        collectDirectChanges(
          previousChildren,
          currentChildren,
          previousPath,
          currentPath,
          result,
        )
      }
    })
  }

  const collectEffectiveRootProperties = (
    rootNode: TreeNode.Node,
    targetElement: ObjectTypeElement.Element,
  ): ReadonlyMap<string, TypeExpression.Property> => {
    const analysis = ObjectInheritance.analyze(
      targetElement.baseObjectIds,
      targetElement.properties,
      (objectTypeId) => {
        const object = objectTypeId === targetElement.typeId
          ? targetElement
          : TypeCatalog.findObject(rootNode, objectTypeId)?.element
        return object == null
          ? null
          : {
              value: object.typeId,
              label: object.id,
              baseObjectIds: object.baseObjectIds,
              properties: object.properties,
            }
      },
    )
    if (analysis.issue != null) throw new Error(analysis.issue.message)
    return new Map(
      [...analysis.effectiveProperties.entries()]
        .map(([name, effective]) => [name, effective.property]),
    )
  }

  const flattenEffectiveProperties = (
    properties: Iterable<TypeExpression.Property>,
    parentPath = '',
    result: Map<string, string> = new Map(),
  ): ReadonlyMap<string, string> => {
    for (const property of properties) {
      const path = createPath(parentPath, property.id)
      result.set(path, getMemberFingerprint(property))
      flattenEffectiveProperties(getInlineProperties(property), path, result)
    }
    return result
  }

  const getEffectiveDiff = (
    previous: ReadonlyMap<string, string>,
    current: ReadonlyMap<string, string>,
  ) => ({
    added: [...current.keys()].filter((path) => !previous.has(path)),
    removed: [...previous.keys()].filter((path) => !current.has(path)),
    updated: [...previous.entries()].flatMap(([path, fingerprint]) => (
      current.has(path) && current.get(path) !== fingerprint ? [path] : []
    )),
  })

  const formatCount = (count: number, label: string): string | null => (
    count === 0 ? null : `${count} ${label}`
  )

  const createNotices = (
    objectName: string,
    changes: DirectChanges,
    effectiveDiff: ReturnType<typeof getEffectiveDiff>,
    baseSelectionChanged: boolean,
  ): string[] => {
    const directSummary = [
      formatCount(changes.added.length, 'added'),
      formatCount(changes.removed.length, 'removed'),
      formatCount(changes.updated.length, 'updated'),
      formatCount(changes.renamed.length, 'renamed'),
    ].filter((value): value is string => value != null)
    const notices = directSummary.length === 0
      ? []
      : [`Object members changed: ${directSummary.join(' / ')}.`]

    if (changes.renamed.length > 0) {
      const labels = changes.renamed.slice(0, 5).map((change) => (
        `${objectName}.${change.previousPath} -> ${objectName}.${change.currentPath}`
      ))
      if (changes.renamed.length > labels.length) {
        labels.push(`... (+${changes.renamed.length - labels.length} more)`)
      }
      notices.push(`Renamed: ${labels.join(', ')}`)
    }

    if (baseSelectionChanged) {
      const effectiveSummary = [
        formatCount(effectiveDiff.added.length, 'added'),
        formatCount(effectiveDiff.removed.length, 'removed'),
        formatCount(effectiveDiff.updated.length, 'updated'),
      ].filter((value): value is string => value != null)
      notices.push(
        effectiveSummary.length === 0
          ? 'Base Objects changed without changing the effective Object shape.'
          : `Effective Object shape changed: ${effectiveSummary.join(' / ')}.`,
      )
    }
    return notices
  }

  export const analyze = (
    rootNode: TreeNode.Node,
    previousElement: ObjectTypeElement.Element,
    currentElement: ObjectTypeElement.Element,
  ): Analysis => {
    if (previousElement.typeId !== currentElement.typeId) {
      throw new Error('Object Type identity cannot be changed.')
    }
    const changes: DirectChanges = { added: [], removed: [], updated: [], renamed: [] }
    collectDirectChanges(
      previousElement.properties,
      currentElement.properties,
      '',
      '',
      changes,
    )
    const previousEffective = flattenEffectiveProperties(
      collectEffectiveRootProperties(rootNode, previousElement).values(),
    )
    const currentEffective = flattenEffectiveProperties(
      collectEffectiveRootProperties(rootNode, currentElement).values(),
    )
    const effectiveDiff = getEffectiveDiff(previousEffective, currentEffective)
    const baseSelectionChanged = (
      JSON.stringify(previousElement.baseObjectIds)
      !== JSON.stringify(currentElement.baseObjectIds)
    )
    const effectiveShapeChanged = (
      effectiveDiff.added.length > 0
      || effectiveDiff.removed.length > 0
      || effectiveDiff.updated.length > 0
    )
    return {
      ...changes,
      effectiveAddedPaths: effectiveDiff.added,
      effectiveRemovedPaths: effectiveDiff.removed,
      effectiveUpdatedPaths: effectiveDiff.updated,
      effectiveShapeChanged,
      notices: createNotices(
        currentElement.id,
        changes,
        effectiveDiff,
        baseSelectionChanged,
      ),
    }
  }
}

export default ObjectDefinitionUpdatePolicy
