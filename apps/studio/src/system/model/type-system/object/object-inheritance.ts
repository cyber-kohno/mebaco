import type TypeExpression from '../type-expression'

namespace ObjectInheritance {
  export type Definition = {
    value: string
    label: string
    baseObjectIds: readonly string[]
    properties: readonly TypeExpression.Property[]
  }

  export type EffectiveProperty = {
    property: TypeExpression.Property
    ownerObjectId: string
    ownerLabel: string
    rootBaseObjectIds: readonly string[]
  }

  export type DuplicateBaseIssue = {
    type: 'duplicate-base'
    message: string
    baseObjectIds: readonly string[]
  }

  export type UnavailableBaseIssue = {
    type: 'unavailable-base'
    message: string
    baseObjectIds: readonly string[]
  }

  export type CircularInheritanceIssue = {
    type: 'circular-inheritance'
    message: string
    baseObjectIds: readonly string[]
  }

  export type InheritedPropertyConflictIssue = {
    type: 'inherited-property-conflict'
    message: string
    propertyName: string
    propertyIds: readonly string[]
    baseObjectIds: readonly string[]
  }

  export type LocalPropertyConflictIssue = {
    type: 'local-property-conflict'
    message: string
    propertyName: string
    propertyId: string
    inheritedPropertyId: string
    baseObjectIds: readonly string[]
  }

  export type Issue =
    | DuplicateBaseIssue
    | UnavailableBaseIssue
    | CircularInheritanceIssue
    | InheritedPropertyConflictIssue
    | LocalPropertyConflictIssue

  export type Analysis = {
    inheritedProperties: ReadonlyMap<string, EffectiveProperty>
    effectiveProperties: ReadonlyMap<string, EffectiveProperty>
    issue: Issue | null
  }

  const appendUnique = (values: readonly string[], value: string): readonly string[] => (
    values.includes(value) ? values : [...values, value]
  )

  const emptyAnalysis = (issue: Issue): Analysis => ({
    inheritedProperties: new Map(),
    effectiveProperties: new Map(),
    issue,
  })

  export const analyze = (
    baseObjectIds: readonly string[],
    localProperties: readonly TypeExpression.Property[],
    resolve: (objectId: string) => Definition | null,
  ): Analysis => {
    const duplicatedBaseId = baseObjectIds.find(
      (objectId, index) => baseObjectIds.indexOf(objectId) !== index,
    )
    if (duplicatedBaseId != null) {
      return emptyAnalysis({
        type: 'duplicate-base',
        message: 'Base Object is duplicated.',
        baseObjectIds: [duplicatedBaseId],
      })
    }

    const inherited = new Map<string, EffectiveProperty>()
    let issue: Issue | null = null

    const collect = (
      objectId: string,
      rootBaseObjectId: string,
      visiting: ReadonlySet<string>,
    ): void => {
      if (issue != null) return
      if (visiting.has(objectId)) {
        issue = {
          type: 'circular-inheritance',
          message: 'Base Object inheritance is circular.',
          baseObjectIds: [rootBaseObjectId],
        }
        return
      }

      const definition = resolve(objectId)
      if (definition == null) {
        issue = {
          type: 'unavailable-base',
          message: 'Base Object is unavailable.',
          baseObjectIds: [rootBaseObjectId],
        }
        return
      }

      const nextVisiting = new Set(visiting)
      nextVisiting.add(objectId)
      definition.baseObjectIds.forEach((baseObjectId) => {
        collect(baseObjectId, rootBaseObjectId, nextVisiting)
      })
      if (issue != null) return

      const localNames = new Set<string>()
      for (const property of definition.properties) {
        if (localNames.has(property.id)) {
          issue = {
            type: 'inherited-property-conflict',
            message: `Inherited property "${property.id}" conflicts.`,
            propertyName: property.id,
            propertyIds: [property.propertyId],
            baseObjectIds: [rootBaseObjectId],
          }
          return
        }
        localNames.add(property.id)

        const previous = inherited.get(property.id)
        if (previous == null) {
          inherited.set(property.id, {
            property,
            ownerObjectId: definition.value,
            ownerLabel: definition.label,
            rootBaseObjectIds: [rootBaseObjectId],
          })
          continue
        }

        const sameOrigin = (
          previous.ownerObjectId === definition.value
          && previous.property.propertyId === property.propertyId
        )
        if (sameOrigin) {
          inherited.set(property.id, {
            ...previous,
            rootBaseObjectIds: appendUnique(previous.rootBaseObjectIds, rootBaseObjectId),
          })
          continue
        }

        issue = {
          type: 'inherited-property-conflict',
          message: `Inherited property "${property.id}" conflicts.`,
          propertyName: property.id,
          propertyIds: [previous.property.propertyId, property.propertyId],
          baseObjectIds: appendUnique(previous.rootBaseObjectIds, rootBaseObjectId),
        }
        return
      }
    }

    baseObjectIds.forEach((baseObjectId) => {
      collect(baseObjectId, baseObjectId, new Set())
    })
    if (issue != null) {
      return {
        inheritedProperties: inherited,
        effectiveProperties: new Map(inherited),
        issue,
      }
    }

    const effective = new Map(inherited)
    for (const property of localProperties) {
      const inheritedProperty = inherited.get(property.id)
      if (inheritedProperty != null) {
        return {
          inheritedProperties: inherited,
          effectiveProperties: effective,
          issue: {
            type: 'local-property-conflict',
            message: `Local property "${property.id}" conflicts with a Base Object.`,
            propertyName: property.id,
            propertyId: property.propertyId,
            inheritedPropertyId: inheritedProperty.property.propertyId,
            baseObjectIds: inheritedProperty.rootBaseObjectIds,
          },
        }
      }
      effective.set(property.id, {
        property,
        ownerObjectId: '',
        ownerLabel: '',
        rootBaseObjectIds: [],
      })
    }

    return {
      inheritedProperties: inherited,
      effectiveProperties: effective,
      issue: null,
    }
  }
}

export default ObjectInheritance
