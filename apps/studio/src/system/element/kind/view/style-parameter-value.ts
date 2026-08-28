import StyleValueSupport from './style-value-support'
import type StyleParamElement from './style-param-element'

namespace StyleParameterValue {
  export const createTypeDefault = (
    valueType: StyleParamElement.ValueType,
  ): StyleParamElement.Literal => {
    switch (valueType) {
      case 'string':
        return ''
      case 'number':
        return 0
      case 'boolean':
        return false
      case 'color':
        return '#000'
    }
  }

  export const getFormulaExpectedType = (
    valueType: StyleParamElement.ValueType,
  ): 'string' | 'number' | 'boolean' => (
    valueType === 'color' ? 'string' : valueType
  )

  export const validateColor = (
    value: string,
  ): string | null => {
    if (value.trim().length === 0) return 'Enter a valid color.'
    return StyleValueSupport.check('color', value) === 'unsupported'
      ? 'Enter a valid color.'
      : null
  }
}

export default StyleParameterValue
