import type TreeNode from '../../../../tree/tree-node'
import type StyleElement from './style-element'
import type StyleParamElement from './style-param-element'
import StyleArgumentContract from './style-argument-contract'

namespace StyleParameterCatalog {
  export type Parameter = {
    parameterId: string
    id: string
    valueType: StyleParamElement.ValueType
    defaultValue?: StyleParamElement.Literal
    sourceStyleId: string
    sourceStyleName: string
    sourcePath: string[]
  }

  export type Issue =
    | {
        type: 'missing-style'
        styleId: string
        path: string[]
        message: string
      }
    | {
        type: 'cycle'
        styleId: string
        path: string[]
        message: string
      }
    | {
        type: 'parameter-conflict'
        parameterId: string
        parameterName: string
        sourceStyleIds: string[]
        path: string[]
        message: string
      }
    | {
        type: 'argument-invariant'
        styleId: string
        referenceId: string
        path: string[]
        message: string
      }

  export type Result = {
    parameters: Parameter[]
    issues: Issue[]
  }

  export type Catalog = {
    styleIds: string[]
    getDirectParameters: (styleId: string) => Parameter[]
    resolve: (styleId: string, ancestorStyleIds?: readonly string[]) => Result
  }

  type StyleRecord = {
    element: StyleElement.Element
    parameters: StyleParamElement.Element[]
  }

  const getStyleParameters = (
    node: TreeNode.Node,
  ): StyleParamElement.Element[] => {
    const paramsNode = node.children.find((child) => child.element.kind === 'style-params')
    if (paramsNode == null) return []

    return paramsNode.children
      .map((child) => child.element)
      .filter((element): element is StyleParamElement.Element => element.kind === 'style-param')
  }

  const isResolvedArgument = (
    argument: StyleElement.Argument | undefined,
    parameter: Parameter,
  ): boolean => {
    if (argument == null || argument.binding.type === 'delegate') return false
    if (argument.binding.type === 'default') return parameter.defaultValue !== undefined
    return true
  }

  const mergeParameters = (
    parameters: readonly Parameter[],
    path: readonly string[],
  ): Result => {
    const merged: Parameter[] = []
    const issues: Issue[] = []

    parameters.forEach((parameter) => {
      const existing = merged.find((item) => item.id === parameter.id)
      if (existing == null) {
        merged.push(parameter)
        return
      }

      if (existing.sourceStyleId === parameter.sourceStyleId) return

      const sourceStyleIds = Array.from(new Set([
        existing.sourceStyleId,
        parameter.sourceStyleId,
      ]))
      if (issues.some((issue) => (
        issue.type === 'parameter-conflict'
        && issue.parameterName === parameter.id
      ))) return

      issues.push({
        type: 'parameter-conflict',
        parameterId: parameter.parameterId,
        parameterName: parameter.id,
        sourceStyleIds,
        path: [...path],
        message: `Parameter '${parameter.id}' is exposed by multiple styles: ${[existing.sourceStyleName, parameter.sourceStyleName].join(', ')}.`,
      })
    })

    return { parameters: merged, issues }
  }

  export const createCatalog = (
    rootNode: TreeNode.Node,
  ): Catalog => {
    const records = new Map<string, StyleRecord>()

    const collect = (node: TreeNode.Node) => {
      if (node.element.kind === 'style' && !records.has(node.element.styleId)) {
        records.set(node.element.styleId, {
          element: node.element,
          parameters: getStyleParameters(node),
        })
      }
      node.children.forEach(collect)
    }
    collect(rootNode)

    const resolve = (
      styleId: string,
      ancestorStyleIds: readonly string[] = [],
    ): Result => {
      const path = [...ancestorStyleIds, styleId]
      const pathNames = path.map((id) => records.get(id)?.element.id ?? id)
      if (ancestorStyleIds.includes(styleId)) {
        return {
          parameters: [],
          issues: [{
            type: 'cycle',
            styleId,
            path: pathNames,
            message: `Style inheritance cycle: ${pathNames.join(' -> ')}.`,
          }],
        }
      }

      const record = records.get(styleId)
      if (record == null) {
        return {
          parameters: [],
          issues: [{
            type: 'missing-style',
            styleId,
            path: pathNames,
            message: `Style '${styleId}' was not found.`,
          }],
        }
      }

      const inheritedParameters: Parameter[] = []
      const issues: Issue[] = []
      ;(record.element.bases ?? []).forEach((base) => {
        const baseResult = resolve(base.styleId, path)
        issues.push(...baseResult.issues)
        if (baseResult.issues.length > 0) return
        const invariantError = StyleArgumentContract.getInvariantError(
          base.arguments,
          baseResult.parameters,
          'inheritance',
        )
        if (invariantError != null) {
          issues.push({
            type: 'argument-invariant',
            styleId,
            referenceId: base.referenceId,
            path: pathNames,
            message: `Style '${record.element.id}' has invalid arguments for inherited Style '${records.get(base.styleId)?.element.id ?? base.styleId}': ${invariantError}`,
          })
          return
        }
        baseResult.parameters.forEach((parameter) => {
          const argument = base.arguments.find((item) => (
            item.parameterId === parameter.parameterId
          ))
          if (!isResolvedArgument(argument, parameter)) {
            inheritedParameters.push(parameter)
          }
        })
      })

      const ownParameters = record.parameters.map((parameter): Parameter => ({
        parameterId: parameter.parameterId,
        id: parameter.id,
        valueType: parameter.valueType,
        defaultValue: parameter.defaultValue,
        sourceStyleId: styleId,
        sourceStyleName: record.element.id,
        sourcePath: pathNames,
      }))
      const merged = mergeParameters(
        [...inheritedParameters, ...ownParameters],
        pathNames,
      )

      return {
        parameters: merged.parameters,
        issues: [...issues, ...merged.issues],
      }
    }

    return {
      styleIds: Array.from(records.keys()),
      getDirectParameters: (styleId) => (
        records.get(styleId)?.parameters.map((parameter) => ({
          parameterId: parameter.parameterId,
          id: parameter.id,
          valueType: parameter.valueType,
          defaultValue: parameter.defaultValue,
          sourceStyleId: styleId,
          sourceStyleName: records.get(styleId)?.element.id ?? styleId,
          sourcePath: [records.get(styleId)?.element.id ?? styleId],
        })) ?? []
      ),
      resolve,
    }
  }
}

export default StyleParameterCatalog
