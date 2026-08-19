import type MebacoElement from '../element/element'
import type StyleResolver from '../element/kind/view/style-resolver'
import StylePropertyName from '../element/kind/view/style-property-name'
import ValueSource from '../ui/input/value-source'
import TypeExpression from '../element/kind/type/type-expression'
import ObjectShape from '../element/kind/type/object-shape'
import UnionDefinition from '../element/kind/type/union-definition'
import type ComponentReference from '../element/kind/component/shared/component-reference'
import ExpressionTypeInference from '../element/kind/type/expression-type-inference'
import SwitchValueType from '../element/kind/directive/switch-value-type'
import ValueTypeDefinition from '../element/kind/type/value-type-definition'

namespace ElementEditSchema {
  export type TextCharset = 'identifier' | 'pascalIdentifier' | 'jsIdentifier' | 'any'

  export type FieldVisibility = {
    key: string
    value: string
  }

  export type FieldBase = {
    tab?: string
    visibleWhen?: FieldVisibility
    visibleWhenAll?: readonly FieldVisibility[]
    width?: 'id' | 'tagName' | 'mode' | 'valueType' | 'arrayDepth' | 'literalUnion'
  }

  export type TextField = {
    type: 'text'
    key: string
    label: string
    defaultValue?: string
    required?: boolean
    charset?: TextCharset
    minLength?: number
    maxLength?: number
    reservedNames?: readonly string[]
    differentFromKeys?: readonly string[]
    differentFromWhen?: FieldVisibility
  } & FieldBase

  export type SelectOption = {
    value: string
    label?: string
    detail?: string
    title?: string
  }

  export type SelectField = {
    type: 'select'
    key: string
    label: string
    defaultValue?: string
    required?: boolean
    options: readonly SelectOption[]
    reservedValues?: readonly string[]
    clearWhenChanged?: readonly string[]
  } & FieldBase

  export type NumberField = {
    type: 'number'
    key: string
    label: string
    defaultValue?: string
    required?: boolean
    integer?: boolean
    min?: number
    max?: number
    reservedValues?: readonly number[]
  } & FieldBase

  export type CheckboxField = {
    type: 'checkbox'
    key: string
    label: string
    defaultValue?: 'true' | 'false'
  } & FieldBase

  export type HeadingField = {
    type: 'heading'
    key: string
    label: string
    defaultValue?: never
  } & FieldBase

  export type LiteralField = {
    type: 'literal'
    key: string
    label: string
    defaultValue?: string
    valueTypeKey: string
    enabledWhen: FieldVisibility
  } & FieldBase

  export type FormulaField = {
    type: 'formula'
    key: string
    label: string
    defaultValue?: string
    required?: boolean
    maxLength?: number
    expectedType?: 'string' | 'number' | 'boolean' | 'array'
    getExpectedTypeText?: (values: Readonly<Record<string, string>>) => string | undefined
    allowAwaitInAsyncFunction?: boolean
  } & FieldBase

  export type ScriptField = {
    type: 'script'
    key: string
    label: string
    defaultValue?: string
    required?: boolean
    maxLength?: number
    allowAwaitInAsyncFunction?: boolean
  } & FieldBase

  export type ValueSourceField = {
    type: 'valueSource'
    key: string
    label: string
    defaultValue?: string
    maxFormulaLength?: number
    valueTypeKey?: string
    arrayDepthKey?: string
    valueTypeDefinitionKey?: string
    getExpectedTypeText?: (values: Readonly<Record<string, string>>) => string | undefined
  } & FieldBase

  export type ValueTypeField = {
    type: 'valueType'
    key: string
    label: string
    defaultValue?: string
    required?: boolean
    objectOptions: readonly SelectOption[]
    namedTypeOptions: readonly SelectOption[]
  } & FieldBase

  export type StylePropsField = {
    type: 'styleProps'
    key: string
    label: string
    defaultValue?: string
  } & FieldBase

  export type StyleApplicationsField = {
    type: 'styleApplications'
    key: string
    label: string
    defaultValue?: string
    options: readonly SelectOption[]
    getResolution?: (styleId: string) => StyleResolver.Result
  } & FieldBase

  export type StyleBasesField = {
    type: 'styleBases'
    key: string
    label: string
    defaultValue?: string
    options: readonly SelectOption[]
    getResolution?: (styleId: string) => StyleResolver.Result
    ownerParameters?: readonly StyleResolver.Parameter[]
  } & FieldBase

  export type StyleMonitorField = {
    type: 'styleMonitor'
    key: string
    label: string
    defaultValue?: string
    idKey: string
    rulesKey: string
    basesKey: string
  } & FieldBase

  export type TagStyleMonitorField = {
    type: 'tagStyleMonitor'
    key: string
    label: string
    defaultValue?: string
    stylesKey: string
  } & FieldBase

  export type TagAttributesField = {
    type: 'tagAttributes'
    key: string
    label: string
    defaultValue?: string
  } & FieldBase

  export type TagRefKeyField = {
    type: 'tagRefKey'
    key: string
    label: string
    defaultValue?: string
  } & FieldBase

  export type ObjectShapeField = {
    type: 'objectShape'
    key: string
    label: string
    defaultValue?: string
    idKey: string
    objectOptions: readonly ObjectShape.ObjectOption[]
    namedTypeOptions: readonly SelectOption[]
  } & FieldBase

  export type UnionDefinitionField = {
    type: 'unionDefinition'
    key: string
    label: string
    defaultValue?: string
    objectOptions: readonly ObjectShape.ObjectOption[]
  } & FieldBase

  export type ComponentBindingsField = {
    type: 'componentBindings'
    key: string
    label: string
    defaultValue?: string
    required?: boolean
    componentIdKey: string
    components: readonly ComponentReference.Option[]
  } & FieldBase

  export type SwitchValueTypeField = {
    type: 'switchValueType'
    key: string
    label: string
    defaultValue?: string
    literalUnionOptions: readonly SwitchValueType.LiteralUnionOption[]
    caseValueType?: SwitchValueType.PrimitiveName
  } & FieldBase

  export type Field =
    | TextField
    | SelectField
    | NumberField
    | CheckboxField
    | HeadingField
    | LiteralField
    | FormulaField
    | ScriptField
    | ValueSourceField
    | ValueTypeField
    | StylePropsField
    | StyleApplicationsField
    | StyleBasesField
    | StyleMonitorField
    | TagStyleMonitorField
    | TagAttributesField
    | TagRefKeyField
    | ObjectShapeField
    | UnionDefinitionField
    | ComponentBindingsField
    | SwitchValueTypeField

  export type Tab = {
    id: string
    label: string
  }

  export type Schema<TElement extends MebacoElement.Element> = {
    createTitle: string
    updateTitle: string
    tabs?: readonly Tab[]
    fields: readonly Field[]
    createPreview?(): TElement
    getInitialValues(element: TElement): Record<string, string>
    create(values: Record<string, string>): TElement
    update(element: TElement, values: Record<string, string>): TElement
  }

  export const validateText = (
    field: TextField,
    value: string,
    values: Readonly<Record<string, string>> = {},
  ): string | null => {
    if (field.required === true && value.length === 0) return 'Required.'
    if (field.minLength != null && value.length < field.minLength) {
      return `Must be at least ${field.minLength} characters.`
    }
    if (field.maxLength != null && value.length > field.maxLength) {
      return `Must be ${field.maxLength} characters or fewer.`
    }
    if (field.charset === 'identifier' && value.length > 0 && !/^[a-z][a-z0-9-]*$/.test(value)) {
      return 'Use lowercase letters, numbers, and hyphens. Start with a letter.'
    }
    if (field.charset === 'pascalIdentifier' && value.length > 0 && !/^[A-Z][A-Za-z0-9]*$/.test(value)) {
      return 'Use PascalCase letters and numbers. Start with an uppercase letter.'
    }
    if (field.charset === 'jsIdentifier' && value.length > 0 && !/^[a-z][A-Za-z0-9]*$/.test(value)) {
      return 'Use letters and numbers. Start with a lowercase letter.'
    }
    if (field.reservedNames?.includes(value) === true) {
      return 'Already exists.'
    }
    const shouldCompareRelatedValues = field.differentFromWhen == null
      || values[field.differentFromWhen.key] === field.differentFromWhen.value
    if (
      shouldCompareRelatedValues
      && field.differentFromKeys?.some((key) => values[key] === value) === true
    ) {
      return 'Must use a different name.'
    }

    return null
  }

  export const validateSelect = (field: SelectField, value: string): string | null => {
    if (field.required === true && value.length === 0) return 'Required.'
    if (value.length > 0 && field.options.every((option) => option.value !== value)) {
      return 'Select a valid option.'
    }
    if (field.reservedValues?.includes(value) === true) return 'Already exists.'

    return null
  }

  export const validateNumber = (field: NumberField, value: string): string | null => {
    if (field.required === true && value.length === 0) return 'Required.'
    if (value.length === 0) return null

    const numberValue = Number(value)
    if (!Number.isFinite(numberValue)) return 'Enter a valid number.'
    if (field.integer === true && !Number.isInteger(numberValue)) return 'Enter a whole number.'
    if (field.min != null && numberValue < field.min) return `Must be ${field.min} or greater.`
    if (field.max != null && numberValue > field.max) return `Must be ${field.max} or fewer.`
    if (field.reservedValues?.some((reserved) => reserved === numberValue) === true) {
      return 'Already exists.'
    }
    return null
  }

  export const validateLiteral = (
    field: LiteralField,
    value: string,
    values: Readonly<Record<string, string>>,
  ): string | null => {
    if (values[field.enabledWhen.key] !== field.enabledWhen.value) return null

    switch (values[field.valueTypeKey]) {
      case 'string':
      case 'color':
        return null
      case 'number':
        return value.length > 0 && Number.isFinite(Number(value))
          ? null
          : 'Enter a valid number.'
      case 'boolean':
        return value === 'true' || value === 'false'
          ? null
          : 'Select true or false.'
      default:
        return 'Select a valid value type.'
    }
  }

  export const validateFormula = (
    field: FormulaField,
    value: string,
    injectionSource?: string,
  ): string | null => {
    if (field.required === true && value.length === 0) return 'Required.'
    if (field.maxLength != null && value.length > field.maxLength) {
      return `Must be ${field.maxLength} characters or fewer.`
    }

    if (
      (
        field.expectedType === 'string'
        || field.expectedType === 'number'
        || field.expectedType === 'boolean'
      )
      && injectionSource != null
    ) {
      const inferred = ExpressionTypeInference.inferType(injectionSource, value, true)
      if (!inferred.ok) return inferred.error
      return inferred.typeText === field.expectedType
        ? null
        : `Expression must return ${field.expectedType}.`
    }

    if (field.expectedType === 'array' && injectionSource != null) {
      const inferred = ExpressionTypeInference.inferArrayItem(injectionSource, value)
      return inferred.ok ? null : inferred.error
    }

    return null
  }

  export const validateTagRefKey = (
    value: string,
    injectionSource?: string,
  ): string | null => {
    if (value.length === 0) return null

    try {
      const parsed = JSON.parse(value) as {
        type?: unknown
        value?: unknown
        source?: unknown
      } | null
      if (parsed == null || typeof parsed !== 'object') return 'Select a valid Ref key.'
      if (parsed.type === 'literal') {
        return typeof parsed.value === 'string' && parsed.value.length > 0
          ? null
          : 'Enter a Ref key.'
      }
      if (parsed.type !== 'formula' || typeof parsed.source !== 'string') {
        return 'Select a valid Ref key.'
      }
      if (parsed.source.length === 0) return 'Enter a Ref key formula.'
      if (injectionSource == null) return null

      const inferred = ExpressionTypeInference.inferType(
        injectionSource,
        parsed.source,
        true,
      )
      if (!inferred.ok) return inferred.error
      return inferred.typeText === 'string'
        ? null
        : 'Expression must return string.'
    } catch {
      return 'Select a valid Ref key.'
    }
  }

  export const validateScript = (field: ScriptField, value: string): string | null => {
    if (field.required === true && value.length === 0) return 'Required.'
    if (field.maxLength != null && value.length > field.maxLength) {
      return `Must be ${field.maxLength} characters or fewer.`
    }
    return null
  }

  export const validateValueSource = (
    field: ValueSourceField,
    value: string,
    values: Readonly<Record<string, string>>,
  ): string | null => {
    const source = ValueSource.parse(value)
    if (source == null) return 'Select a valid initial value.'
    const definition = field.valueTypeDefinitionKey == null
      ? null
      : ValueTypeDefinition.parse(values[field.valueTypeDefinitionKey] ?? '')
    const valueType = definition == null
      ? values[field.valueTypeKey ?? ''] ?? 'string'
      : ValueTypeDefinition.getBaseType(definition)
    const arrayDepth = definition == null
      ? Number(values[field.arrayDepthKey ?? ''] ?? '0')
      : ValueTypeDefinition.getArrayDepth(definition)

    if (source.type === 'literal') {
      if (arrayDepth > 0 || valueType === 'reference') {
        return 'Literal is not available for this value type.'
      }
      if (valueType === 'named') return 'Literal is not available for this value type.'
      if (valueType === 'number' && (
        source.value.trim().length === 0
        || !Number.isFinite(Number(source.value))
      )) return 'Enter a valid number.'
      if (valueType === 'boolean' && source.value !== 'true' && source.value !== 'false') {
        return 'Select true or false.'
      }
    }
    if (
      source.type === 'formula'
      && source.source.length === 0
    ) return 'Enter a formula.'
    if (
      source.type === 'formula'
      && field.maxFormulaLength != null
      && source.source.length > field.maxFormulaLength
    ) return `Must be ${field.maxFormulaLength} characters or fewer.`

    return null
  }

  export const validateValueType = (
    field: ValueTypeField,
    value: string,
  ): string | null => {
    const definition = ValueTypeDefinition.parse(value)
    if (definition == null) return 'Select a valid Value Type.'
    return TypeExpression.validateProperties(
      [TypeExpression.createProperty('value', definition.valueType)],
      new Set(field.objectOptions.map((option) => option.value)),
      new Set(field.namedTypeOptions.map((option) => option.value)),
    )
  }

  export const validateStyleProps = (value: string): string | null => {
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) return 'Invalid properties.'

      const hasInvalid = parsed.some((item) => !isStyleRule(item))
      if (hasInvalid) return 'Fill all properties and values.'

      const states = parsed
        .filter((item) => item?.type === 'state')
        .map((item) => item.state)
      if (new Set(states).size !== states.length) return 'Style state is duplicated.'

      const defaultDeclarations = parsed.filter((item) => item.type === 'declaration')
      if (StylePropertyName.hasDuplicates(defaultDeclarations)) {
        return 'Style property is duplicated in this state.'
      }

      const hasStateDuplicates = parsed
        .filter((item) => item.type === 'state')
        .some((item) => StylePropertyName.hasDuplicates(item.declarations))
      if (hasStateDuplicates) return 'Style property is duplicated in this state.'

      return null
    } catch {
      return 'Invalid properties.'
    }
  }

  export const validateStyleApplications = (
    field: StyleApplicationsField,
    value: string,
  ): string | null => {
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) return 'Invalid styles.'

      const referenceIds = parsed
        .map((item) => (
          item != null && typeof item === 'object'
            ? (item as { referenceId?: unknown }).referenceId
            : undefined
        ))
        .filter((referenceId): referenceId is string => typeof referenceId === 'string')
      if (new Set(referenceIds).size !== referenceIds.length) return 'Reference is duplicated.'

      const hasInvalid = parsed.some((item) => {
        if (item == null || typeof item !== 'object') return true

        const ref = item as {
          referenceId?: unknown
          styleId?: unknown
          condition?: unknown
          arguments?: unknown
        }

        const condition = ref.condition as {
          type?: unknown
          source?: unknown
        } | null

        if (
          typeof ref.referenceId !== 'string'
          || ref.referenceId.length === 0
          || typeof ref.styleId !== 'string'
          || ref.styleId.length === 0
          || field.options.every((option) => option.value !== ref.styleId)
          || !Array.isArray(ref.arguments)
          || (
            condition != null
            && (
              condition.type !== 'formula'
              || typeof condition.source !== 'string'
              || condition.source.length === 0
            )
          )
        ) return true

        const resolution = field.getResolution?.(ref.styleId)
        if (resolution == null || resolution.issues.length > 0) return true

        const argumentsValue = ref.arguments as unknown[]
        if (argumentsValue.length !== resolution.parameters.length) return true

        return resolution.parameters.some((parameter) => {
          const matches = argumentsValue.filter((item) => (
            item != null
            && typeof item === 'object'
            && (item as { parameterId?: unknown }).parameterId === parameter.parameterId
          ))
          if (matches.length !== 1) return true

          const argument = matches[0] as { binding?: unknown }
          return isInvalidStyleArgumentBinding(argument.binding, parameter, false)
        })
      })

      return hasInvalid ? 'Select valid styles.' : null
    } catch {
      return 'Invalid styles.'
    }
  }

  export const validateStyleBases = (field: StyleBasesField, value: string): string | null => {
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) return 'Invalid inheritance.'

      const referenceIds = parsed
        .map((item) => (
          item != null && typeof item === 'object'
            ? (item as { referenceId?: unknown }).referenceId
            : undefined
        ))
        .filter((referenceId): referenceId is string => typeof referenceId === 'string')
      if (new Set(referenceIds).size !== referenceIds.length) return 'Reference is duplicated.'

      const hasInvalid = parsed.some((item) => {
        if (item == null || typeof item !== 'object') return true

        const base = item as {
          referenceId?: unknown
          styleId?: unknown
          condition?: unknown
          arguments?: unknown
        }
        const condition = base.condition as {
          type?: unknown
          source?: unknown
        } | null

        if (
          typeof base.referenceId !== 'string'
          || base.referenceId.length === 0
          || typeof base.styleId !== 'string'
          || base.styleId.length === 0
          || field.options.every((option) => option.value !== base.styleId)
          || !Array.isArray(base.arguments)
          || (
            condition != null
            && (
              condition.type !== 'formula'
              || typeof condition.source !== 'string'
              || condition.source.length === 0
            )
          )
        ) return true

        const resolution = field.getResolution?.(base.styleId)
        if (resolution?.issues.length) return true

        const argumentsValue = base.arguments as unknown[]
        return argumentsValue.some((item) => {
          if (item == null || typeof item !== 'object') return true
          const argument = item as {
            parameterId?: unknown
            binding?: unknown
          }
          if (typeof argument.parameterId !== 'string') return true

          const parameter = resolution?.parameters.find((candidate) => (
            candidate.parameterId === argument.parameterId
          ))
          if (parameter == null) return true
          return isInvalidStyleArgumentBinding(argument.binding, parameter, true)
        })
      })

      if (hasInvalid) return 'Select valid inherited styles.'

      const exposedParameters = [...(field.ownerParameters ?? [])]
      parsed.forEach((item) => {
        const base = item as {
          styleId: string
          arguments: Array<{
            parameterId?: unknown
            binding?: unknown
          }>
        }
        const resolution = field.getResolution?.(base.styleId)
        resolution?.parameters.forEach((parameter) => {
          const argument = base.arguments.find((candidate) => (
            candidate.parameterId === parameter.parameterId
          ))
          if (isResolvedStyleArgument(argument?.binding, parameter)) return
          exposedParameters.push(parameter)
        })
      })

      const conflictingParameter = exposedParameters.find((parameter, index) => (
        exposedParameters.some((candidate, candidateIndex) => (
          candidateIndex !== index
          && candidate.parameterId === parameter.parameterId
          && candidate.sourceStyleId !== parameter.sourceStyleId
        ))
      ))

      return conflictingParameter == null
        ? null
        : `Parameter '${conflictingParameter.parameterId}' conflicts between inherited styles.`
    } catch {
      return 'Invalid inheritance.'
    }
  }

  const isResolvedStyleArgument = (
    binding: unknown,
    parameter: StyleResolver.Parameter,
  ): boolean => {
    if (binding == null || typeof binding !== 'object') return false

    const candidate = binding as {
      type?: unknown
    }
    if (candidate.type === 'delegate') return false
    if (candidate.type === 'default') return parameter.defaultValue !== undefined
    return candidate.type === 'value'
  }

  const isInvalidStyleArgumentBinding = (
    binding: unknown,
    parameter: StyleResolver.Parameter,
    allowDelegate: boolean,
  ): boolean => {
    if (binding == null || typeof binding !== 'object') return true

    const candidate = binding as {
      type?: unknown
      value?: unknown
    }
    if (candidate.type === 'delegate') return !allowDelegate
    if (candidate.type === 'default') return parameter.defaultValue === undefined
    if (candidate.type !== 'value' || candidate.value == null || typeof candidate.value !== 'object') {
      return true
    }

    const parameterValue = candidate.value as {
      type?: unknown
      value?: unknown
      source?: unknown
    }
    if (parameterValue.type === 'formula') {
      return typeof parameterValue.source !== 'string' || parameterValue.source.length === 0
    }
    if (parameterValue.type === 'literal') {
      const expectedType = parameter.valueType === 'color' ? 'string' : parameter.valueType
      return typeof parameterValue.value !== expectedType
    }
    return true
  }

  export const validateTagAttributes = (value: string): string | null => {
    try {
      const parsed = JSON.parse(value)
      if (!Array.isArray(parsed)) return 'Invalid attributes.'

      const hasInvalid = parsed.some((item) => !isTagAttribute(item))
      return hasInvalid ? 'Fill all attributes.' : null
    } catch {
      return 'Invalid attributes.'
    }
  }

  export const validateObjectShape = (
    field: ObjectShapeField,
    value: string,
  ): string | null => {
    const shape = ObjectShape.parse(value)
    if (shape == null) return 'Invalid Object definition.'
    return ObjectShape.validate(shape, field.objectOptions, field.namedTypeOptions)
  }

  export const validateUnionDefinition = (
    field: UnionDefinitionField,
    value: string,
  ): string | null => {
    const definition = UnionDefinition.parse(value)
    if (definition == null) return 'Invalid Union definition.'
    return UnionDefinition.validate(definition, field.objectOptions)
  }

  export const validateSwitchValueType = (
    field: SwitchValueTypeField,
    value: string,
  ): string | null => {
    const definition = SwitchValueType.parse(value)
    if (definition == null) return 'Select a valid Switch value type.'
    const error = SwitchValueType.validate(definition, field.literalUnionOptions)
    if (error != null) return error
    if (field.caseValueType == null) return null

    const primitive = SwitchValueType.getPrimitiveNameFromOptions(
      definition,
      field.literalUnionOptions,
    )
    return primitive === field.caseValueType
      ? null
      : `Switch value type must remain ${field.caseValueType} while cases exist.`
  }

  const isStyleRule = (item: unknown): boolean => {
    if (item == null || typeof item !== 'object') return false

    const rule = item as {
      type?: unknown
      property?: unknown
      value?: unknown
      state?: unknown
      declarations?: unknown
    }

    if (rule.type === 'declaration') {
      return (
        typeof rule.property === 'string'
        && rule.property.length > 0
        && isStyleValue(rule.value)
      )
    }

    if (rule.type === 'state') {
      return (
        typeof rule.state === 'string'
        && ['hover', 'focus', 'focus-visible', 'active', 'disabled', 'checked'].includes(rule.state)
        && Array.isArray(rule.declarations)
        && rule.declarations.every((declaration) => (
          declaration != null
          && typeof declaration === 'object'
          && (declaration as { type?: unknown }).type === 'declaration'
          && isStyleRule(declaration)
        ))
      )
    }

    return false
  }

  const isStyleValue = (value: unknown): boolean => {
    if (value == null || typeof value !== 'object') return false

    const candidate = value as {
      type?: unknown
      value?: unknown
      source?: unknown
    }
    if (candidate.type === 'literal') {
      return typeof candidate.value === 'string' && candidate.value.length > 0
    }
    if (candidate.type === 'formula') {
      return typeof candidate.source === 'string' && candidate.source.length > 0
    }

    return false
  }

  const isAttributeValue = (value: unknown): boolean => {
    if (value == null || typeof value !== 'object') return false

    const attrValue = value as {
      type?: unknown
      value?: unknown
      source?: unknown
    }

    switch (attrValue.type) {
      case 'empty':
        return true
      case 'literal':
        return typeof attrValue.value === 'string'
      case 'formula':
        return typeof attrValue.source === 'string' && attrValue.source.length > 0
      case 'boolean':
        return typeof attrValue.value === 'boolean'
      default:
        return false
    }
  }

  const isTagAttribute = (item: unknown): boolean => {
    if (item == null || typeof item !== 'object') return false

    const attribute = item as {
      type?: unknown
      name?: unknown
      value?: unknown
      action?: unknown
      preventDefault?: unknown
      stopPropagation?: unknown
    }

    if (attribute.type === 'attribute' || attribute.type === 'property') {
      return (
        typeof attribute.name === 'string'
        && attribute.name.length > 0
        && isAttributeValue(attribute.value)
      )
    }

    if (attribute.type === 'event') {
      const action = attribute.action as {
        type?: unknown
        source?: unknown
      } | null

      return (
        typeof attribute.name === 'string'
        && attribute.name.length > 0
        && typeof attribute.preventDefault === 'boolean'
        && typeof attribute.stopPropagation === 'boolean'
        && action != null
        && action.type === 'script'
        && typeof action.source === 'string'
        && action.source.length > 0
      )
    }

    return false
  }
}

export default ElementEditSchema
