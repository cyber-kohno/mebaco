import type MebacoElement from '../element/element'

namespace TypeImpact {
  const stringify = (value: unknown): string => JSON.stringify(value)

  export const getFingerprint = (
    element: MebacoElement.Element,
  ): string | null => {
    switch (element.kind) {
      case 'state':
      case 'function-argument':
      case 'launch-argument':
      case 'value-prop':
        return stringify({
          valueType: element.valueType,
          nullable: element.nullable,
        })
      case 'variable':
        return stringify(
          element.typeSetting.type === 'inferred'
            ? { typeSetting: element.typeSetting, source: element.source }
            : { typeSetting: element.typeSetting },
        )
      case 'function':
        return stringify(
          element.mode === 'refer'
            ? {
                id: element.id,
                mode: element.mode,
                signatureTypeId: element.signatureTypeId,
              }
            : {
                id: element.id,
                mode: element.mode,
                async: element.async,
                returnType: element.returnType,
              },
        )
      case 'style-param':
        return stringify({ valueType: element.valueType })
      case 'object-type':
        return stringify({
          id: element.id,
          baseObjectIds: element.baseObjectIds,
          properties: element.properties,
        })
      case 'union-type':
        return stringify({ id: element.id, definition: element.definition })
      case 'signature-type':
        return stringify({
          id: element.id,
          async: element.async,
          parameters: element.parameters,
          returnType: element.returnType,
        })
      case 'switch':
      case 'control-switch':
        return stringify(element.valueType)
      default:
        return null
    }
  }

  export const hasChanged = (
    previousElement: MebacoElement.Element,
    nextElement: MebacoElement.Element,
  ): boolean => {
    if (previousElement.kind !== nextElement.kind) return true
    const previousFingerprint = getFingerprint(previousElement)
    const nextFingerprint = getFingerprint(nextElement)
    return previousFingerprint != null
      && nextFingerprint != null
      && previousFingerprint !== nextFingerprint
  }
}

export default TypeImpact
