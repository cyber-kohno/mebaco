import type TreeNode from '../../../tree/tree-node'
import type StyleElement from './style-element'
import type StyleParamElement from './style-param-element'

namespace StyleResolver {
  export type Parameter = {
    parameterId: string
    valueType: StyleParamElement.ValueType
    defaultValue?: StyleParamElement.Literal
    sourceStyleId: string
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
        sourceStyleIds: string[]
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
      const existing = merged.find((item) => item.parameterId === parameter.parameterId)
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
        && issue.parameterId === parameter.parameterId
      ))) return

      issues.push({
        type: 'parameter-conflict',
        parameterId: parameter.parameterId,
        sourceStyleIds,
        path: [...path],
        message: `Parameter '${parameter.parameterId}' is exposed by multiple styles: ${sourceStyleIds.join(', ')}.`,
      })
    })

    return { parameters: merged, issues }
  }

  export const createCatalog = (
    rootNode: TreeNode.Node,
  ): Catalog => {
    const records = new Map<string, StyleRecord>()

    const collect = (node: TreeNode.Node) => {
      if (node.element.kind === 'style' && !records.has(node.element.id)) {
        records.set(node.element.id, {
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
      if (ancestorStyleIds.includes(styleId)) {
        return {
          parameters: [],
          issues: [{
            type: 'cycle',
            styleId,
            path,
            message: `Style inheritance cycle: ${path.join(' -> ')}.`,
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
            path,
            message: `Style '${styleId}' was not found.`,
          }],
        }
      }

      const inheritedParameters: Parameter[] = []
      const issues: Issue[] = []
      ;(record.element.bases ?? []).forEach((base) => {
        const baseResult = resolve(base.styleId, path)
        issues.push(...baseResult.issues)
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
        parameterId: parameter.id,
        valueType: parameter.valueType,
        defaultValue: parameter.defaultValue,
        sourceStyleId: styleId,
        sourcePath: path,
      }))
      const merged = mergeParameters(
        [...inheritedParameters, ...ownParameters],
        path,
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
          parameterId: parameter.id,
          valueType: parameter.valueType,
          defaultValue: parameter.defaultValue,
          sourceStyleId: styleId,
          sourcePath: [styleId],
        })) ?? []
      ),
      resolve,
    }
  }
}

export default StyleResolver
