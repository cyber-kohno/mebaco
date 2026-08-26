import type AppElement from '../element/kind/app/app-element'
import type LaunchArgumentElement from '../element/kind/app/launch-argument-element'
import type LauncherElement from '../element/kind/project/launcher-element'
import type ValuePropElement from '../element/kind/component/definition/value-prop-element'
import type TreeNode from '../tree/tree-node'
import ComponentReference from '../element/kind/component/shared/component-reference'
import TypeExpression from '../element/kind/type/type-expression'
import TypeCatalog from '../element/kind/type/type-catalog'
import TypeValue from './type-value'
import FormulaContext from './formula/formula-context'
import RuntimeProps from './runtime-props'
import ValueSource from '../ui/input/value-source'

namespace RuntimeLaunch {
  export type Result = {
    values: Record<string, unknown>
    errors: string[]
  }

  const collect = (
    node: TreeNode.Node,
    accept: (node: TreeNode.Node) => boolean,
    result: TreeNode.Node[] = [],
  ): TreeNode.Node[] => {
    if (accept(node)) result.push(node)
    node.children.forEach((child) => collect(child, accept, result))
    return result
  }

  const getArguments = (appNode: TreeNode.Node): LaunchArgumentElement.Element[] => {
    const argumentsNode = appNode.children
      .find((child) => child.element.kind === 'launch-options')
      ?.children.find((child) => child.element.kind === 'launch-arguments')
    return argumentsNode?.children
      .map((child) => child.element)
      .filter((element): element is LaunchArgumentElement.Element => element.kind === 'launch-argument')
      ?? []
  }

  const getLauncher = (
    projectNode: TreeNode.Node,
    appId: string,
    launcherId: string,
  ): LauncherElement.Element | null => {
    const app = collect(
      projectNode,
      (node) => node.element.kind === 'app' && node.element.id === appId,
    )[0]?.element
    if (app?.kind !== 'app') return null

    return collect(
      projectNode,
      (node) => node.element.kind === 'launcher',
    )
      .map((node) => node.element)
      .filter((element): element is LauncherElement.Element => element.kind === 'launcher')
      .find((launcher) => (
        launcher.id === launcherId && launcher.appId === app.appId
      )) ?? null
  }

  const toProps = (
    argumentsList: readonly LaunchArgumentElement.Element[],
  ): ValuePropElement.Element[] => argumentsList.map((argument) => ({
    kind: 'value-prop',
    propId: argument.propId,
    id: argument.id,
    valueType: argument.valueType,
    nullable: argument.nullable,
    defaultValue: argument.defaultValue
      ?? (argument.nullable ? ValueSource.createDefault() : undefined),
  }))

  const resolveDefaultValue = (
    argument: LaunchArgumentElement.Element,
    projectNode: TreeNode.Node,
  ): { present: true; value: unknown } | { present: false } | { present: true; error: string } => {
    if (argument.defaultValue?.type === 'default') {
      const prop = toProps([argument])[0]
      if (prop == null) return { present: false }
      return { present: true, value: RuntimeProps.getDefaultValue(prop, projectNode) }
    }
    if (argument.defaultValue?.type !== 'literal') return { present: false }

    const { base, depth } = TypeExpression.unwrapArray(argument.valueType)
    if (
      depth > 0
      || (
        base.type !== 'string'
        && base.type !== 'number'
        && base.type !== 'boolean'
        && base.type !== 'named'
      )
    ) {
      return {
        present: true,
        error: `Launch argument '${argument.id}' has an unsupported default value.`,
      }
    }

    let value: unknown = argument.defaultValue.value
    if (base.type === 'number') {
      value = Number(argument.defaultValue.value)
      if (!Number.isFinite(value)) {
        return {
          present: true,
          error: `Launch argument '${argument.id}' has an invalid default value.`,
        }
      }
    } else if (base.type === 'boolean') {
      if (argument.defaultValue.value !== 'true' && argument.defaultValue.value !== 'false') {
        return {
          present: true,
          error: `Launch argument '${argument.id}' has an invalid default value.`,
        }
      }
      value = argument.defaultValue.value === 'true'
    } else if (base.type === 'named') {
      const union = TypeCatalog.findUnion(projectNode, base.namedTypeId)
      if (union?.element.definition.type !== 'literal') {
        return {
          present: true,
          error: `Launch argument '${argument.id}' has an unsupported default value.`,
        }
      }
      if (union.element.definition.valueType === 'number') {
        value = Number(argument.defaultValue.value)
        if (!Number.isFinite(value)) {
          return {
            present: true,
            error: `Launch argument '${argument.id}' has an invalid default value.`,
          }
        }
      }
    }

    return TypeValue.isCompatible(argument.valueType, value, projectNode)
      ? { present: true, value }
      : {
        present: true,
        error: `Launch argument '${argument.id}' has an incompatible default value.`,
      }
  }

  const resolveDirectValues = (
    argumentsList: readonly LaunchArgumentElement.Element[],
    launchValues: Readonly<Record<string, unknown>>,
    projectNode: TreeNode.Node,
  ): Result => {
    const values: Record<string, unknown> = {}
    const errors: string[] = []
    const argumentIds = new Set(argumentsList.map((argument) => argument.id))

    Object.keys(launchValues).forEach((id) => {
      if (!argumentIds.has(id)) errors.push(`Unknown launch argument '${id}'.`)
    })

    argumentsList.forEach((argument) => {
      const hasExplicitValue = Object.prototype.hasOwnProperty.call(launchValues, argument.id)
      let value: unknown
      if (hasExplicitValue) {
        value = launchValues[argument.id]
      } else {
        const defaultValue = resolveDefaultValue(argument, projectNode)
        if (defaultValue.present) {
          if ('error' in defaultValue) {
            errors.push(defaultValue.error)
            return
          }
          value = defaultValue.value
        } else if (argument.nullable) {
          value = null
        } else {
          errors.push(`Launch argument '${argument.id}' is required.`)
          return
        }
      }
      if (value === null && argument.nullable) {
        values[argument.id] = value
        return
      }
      if (value === null || !TypeValue.isCompatible(argument.valueType, value, projectNode)) {
        errors.push(`Launch argument '${argument.id}' has an incompatible value.`)
        return
      }
      values[argument.id] = value
    })

    return { values, errors }
  }

  const validateResolvedValues = (
    argumentsList: readonly LaunchArgumentElement.Element[],
    bindings: readonly ComponentReference.Binding[],
    result: Result,
    projectNode: TreeNode.Node,
  ): Result => {
    const argumentIds = new Set(argumentsList.map((argument) => argument.propId))
    const errors = [...result.errors]

    bindings.forEach((binding) => {
      if (!argumentIds.has(binding.propId)) {
        errors.push(`Unknown launch argument '${binding.propId}'.`)
      }
    })

    argumentsList.forEach((argument) => {
      if (!Object.prototype.hasOwnProperty.call(result.values, argument.id)) return
      const value = result.values[argument.id]
      if (value === null && argument.nullable) return
      if (!TypeValue.isCompatible(argument.valueType, value, projectNode)) {
        errors.push(`Launch argument '${argument.id}' has an incompatible value.`)
      }
    })

    return { values: result.values, errors }
  }

  export const resolveBindings = (
    appNode: TreeNode.Node & { element: AppElement.Element },
    bindings: readonly ComponentReference.Binding[],
    baseContext: FormulaContext.Value,
    projectNode: TreeNode.Node,
  ): Result => {
    const argumentsList = getArguments(appNode)
    const result = RuntimeProps.resolveBindingsForProps(
      toProps(argumentsList),
      bindings,
      baseContext,
      projectNode,
    )
    return validateResolvedValues(argumentsList, bindings, result, projectNode)
  }

  export const resolve = (options: {
    appNode: TreeNode.Node & { element: AppElement.Element }
    projectNode: TreeNode.Node
    launcherId?: string
    launchValues?: Readonly<Record<string, unknown>>
    baseContext: FormulaContext.Value
  }): Result => {
    const argumentsList = getArguments(options.appNode)
    if (options.launchValues != null) {
      return resolveDirectValues(argumentsList, options.launchValues, options.projectNode)
    }
    if (options.launcherId == null) {
      return argumentsList.length === 0
        ? { values: {}, errors: [] }
        : resolveDirectValues(argumentsList, {}, options.projectNode)
    }

    const launcher = getLauncher(options.projectNode, options.appNode.element.id, options.launcherId)
    if (launcher == null) {
      return { values: {}, errors: [`Launcher '${options.launcherId}' was not found for App '${options.appNode.element.id}'.`] }
    }

    return resolveBindings(
      options.appNode,
      launcher.argumentBindings,
      options.baseContext,
      options.projectNode,
    )
  }
}

export default RuntimeLaunch
