import type MebacoElement from '../../element/element'

namespace TypeImpact {
  const stringify = (value: unknown): string => JSON.stringify(value)

  export const getFingerprint = (
    element: MebacoElement.Element,
  ): string | null => {
    switch (element.kind) {
      case 'app':
        return stringify({ id: element.id })
      case 'state':
      case 'value-prop':
        return stringify({
          valueType: element.valueType,
          nullable: element.nullable,
        })
      case 'launch-argument':
        return stringify({
          id: element.id,
          valueType: element.valueType,
          nullable: element.nullable,
          hasDefaultValue: element.defaultValue != null,
        })
      case 'variable':
        return stringify(
          element.typeSetting.type === 'inferred'
            ? {
                binding: element.binding,
                typeSetting: element.typeSetting,
                source: element.source,
              }
            : {
                binding: element.binding,
                typeSetting: element.typeSetting,
              },
        )
      case 'function':
        return stringify({
          id: element.id,
          signature: element.signature.mode === 'refer'
            ? element.signature
            : {
                mode: 'inline',
                definition: {
                  async: element.signature.definition.async,
                  parameters: element.signature.definition.parameters.map((parameter) => ({
                    parameterId: parameter.parameterId,
                    valueType: parameter.valueType,
                    nullable: parameter.nullable,
                  })),
                  returnType: element.signature.definition.returnType,
                },
              },
        })
      case 'style-param':
        return stringify({ valueType: element.valueType })
      case 'object-type':
        return stringify({
          baseObjectIds: element.baseObjectIds,
          properties: element.properties,
        })
      case 'union-type':
        return stringify({ definition: element.definition })
      case 'signature-type':
        return stringify({
          async: element.async,
          parameters: element.parameters.map((parameter) => ({
            parameterId: parameter.parameterId,
            valueType: parameter.valueType,
            nullable: parameter.nullable,
          })),
          returnType: element.returnType,
        })
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
