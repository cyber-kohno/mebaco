import type StyleElement from './style-element'
import type StyleParameterCatalog from './style-parameter-catalog'
import StyleParameterValue from './style-parameter-value'

namespace StyleArgumentContract {
  export type Usage = 'inheritance' | 'application'

  export class InvariantError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'StyleArgumentInvariantError'
    }
  }

  export const createResolvedBinding = (
    parameter: StyleParameterCatalog.Parameter,
  ): StyleElement.ArgumentBinding => parameter.defaultValue === undefined
    ? {
        type: 'value',
        value: {
          type: 'literal',
          value: StyleParameterValue.createTypeDefault(parameter.valueType),
        },
      }
    : { type: 'default' }

  export const createArguments = (
    parameters: readonly StyleParameterCatalog.Parameter[],
    usage: Usage,
  ): StyleElement.Argument[] => parameters.map((parameter) => ({
    parameterId: parameter.parameterId,
    binding: usage === 'inheritance'
      ? { type: 'delegate' }
      : createResolvedBinding(parameter),
  }))

  export const getInvariantError = (
    arguments_: readonly StyleElement.Argument[],
    parameters: readonly StyleParameterCatalog.Parameter[],
    usage: Usage,
  ): string | null => {
    if (arguments_.length !== parameters.length) {
      return `Style arguments must match all ${parameters.length} exposed parameters.`
    }

    for (const parameter of parameters) {
      const matches = arguments_.filter((argument) => (
        argument.parameterId === parameter.parameterId
      ))
      if (matches.length !== 1) {
        return `Style parameter '${parameter.id}' must have exactly one argument.`
      }
      const binding = matches[0].binding
      if (binding == null || typeof binding !== 'object') {
        return `Style parameter '${parameter.id}' has an invalid argument binding.`
      }
      if (binding.type === 'delegate' && usage !== 'inheritance') {
        return `Style parameter '${parameter.id}' cannot be delegated here.`
      }
      if (binding.type === 'default' && parameter.defaultValue === undefined) {
        return `Style parameter '${parameter.id}' has no default value.`
      }
      if (!['delegate', 'default', 'value'].includes(binding.type)) {
        return `Style parameter '${parameter.id}' has an invalid argument binding.`
      }
    }

    const parameterIds = new Set(parameters.map((parameter) => parameter.parameterId))
    const unknown = arguments_.find((argument) => !parameterIds.has(argument.parameterId))
    return unknown == null
      ? null
      : `Unknown Style parameter argument '${unknown.parameterId}'.`
  }

  export const assert = (
    arguments_: readonly StyleElement.Argument[],
    parameters: readonly StyleParameterCatalog.Parameter[],
    usage: Usage,
  ): void => {
    const error = getInvariantError(arguments_, parameters, usage)
    if (error != null) throw new InvariantError(error)
  }
}

export default StyleArgumentContract
