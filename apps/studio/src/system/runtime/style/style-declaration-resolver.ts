import type TreeNode from '../../tree/tree-node'
import type StyleElement from '../../element/kind/view/style/style-element'
import type StyleParamElement from '../../element/kind/view/style/style-param-element'
import type TagElement from '../../element/kind/view/tag/tag-element'
import StyleParameterCatalog from '../../element/kind/view/style/style-parameter-catalog'
import StyleArgumentContract from '../../element/kind/view/style/style-argument-contract'
import StyleValueSupport from '../../element/kind/view/style/style-value-support'
import FormulaContext from '../formula/formula-context'
import FormulaEvaluator from '../formula/formula-evaluator'
import type ScriptError from '../script/script-error'
import TypeValue from '../type-value'
import VariableFrame from '../variable/variable-frame'

namespace StyleDeclarationResolver {
  export type DeclarationSource = {
    styleId: string
    path: string[]
    valueType: StyleElement.StyleValue['type']
  }

  export type Declaration = {
    property: string
    value: string
    state: StyleElement.State | null
    source: DeclarationSource
    unresolved?: {
      type: 'formula'
      source: string
      message: string
    }
  }

  export type ErrorType =
    | 'structure'
    | 'condition'
    | 'parameter'
    | 'local'
    | 'formula'
    | 'result-type'
    | 'css-value'

  export type Error = {
    type: ErrorType
    message: string
    styleId: string
    referenceId?: string
    path: string[]
    parameterId?: string
    localId?: string
    localNodeId?: number
    property?: string
    scriptError?: ScriptError.Value
    assertion?: boolean
  }

  export type Result = {
    declarations: Declaration[]
    errors: Error[]
  }

  export type ResolveOptions = {
    includeUnresolvedDeclarations?: boolean
  }

  export type Catalog = {
    resolve: (
      applications: readonly TagElement.StyleApplication[],
      context: FormulaContext.Value,
      options?: ResolveOptions,
    ) => Result
  }

  type StyleRecord = {
    element: StyleElement.Element
    parameters: Map<string, StyleParamElement.Element>
    locals: readonly TreeNode.Node[]
  }

  type ResolvedValue = {
    ok: true
    value: string | number | boolean
  } | {
    ok: false
    error: Error
  }

  const collectParameters = (
    node: TreeNode.Node,
  ): Map<string, StyleParamElement.Element> => {
    const paramsNode = node.children.find((child) => child.element.kind === 'style-params')
    const parameters = new Map<string, StyleParamElement.Element>()
    paramsNode?.children.forEach((child) => {
      if (child.element.kind === 'style-param') {
        parameters.set(child.element.parameterId, child.element)
      }
    })
    return parameters
  }

  const collectLocals = (
    node: TreeNode.Node,
  ): readonly TreeNode.Node[] => node.children
    .find((child) => child.element.kind === 'style-locals')
    ?.children.filter((child) => child.element.kind === 'variable') ?? []

  const matchesType = (
    value: unknown,
    valueType: StyleParamElement.ValueType,
  ): value is string | number | boolean => (
    typeof value === (valueType === 'color' ? 'string' : valueType)
  )

  const createFormulaContext = (
    context: FormulaContext.Value,
    parameters: Readonly<Record<string, unknown>>,
  ): FormulaContext.Value => FormulaContext.create({
    ...context,
    $param: { ...parameters },
    $local: {},
  })

  const resolveLocals = (
    localNodes: readonly TreeNode.Node[],
    context: FormulaContext.Value,
    projectNode: TreeNode.Node,
    styleId: string,
    styleName: string,
    path: readonly string[],
  ): { context: FormulaContext.Value; errors: Error[] } => {
    const frame = VariableFrame.create({})
    const localContext = FormulaContext.create({ ...context, $local: frame.values })
    const errors: Error[] = []

    for (const node of localNodes) {
      if (node.element.kind !== 'variable') continue
      const local = node.element
      const evaluated = FormulaEvaluator.evaluateExpression(local.source, localContext)
      if (!evaluated.ok) {
        errors.push({
          type: 'local',
          message: `Failed to evaluate local '${local.id}' in style '${styleName}'.`,
          styleId,
          localId: local.id,
          localNodeId: node.id,
          path: [...path],
          scriptError: evaluated.error,
        })
        break
      }
      if (
        local.typeSetting.type === 'explicit'
        && !(local.typeSetting.nullable && evaluated.value === null)
        && !TypeValue.isCompatible(local.typeSetting.valueType, evaluated.value, projectNode)
      ) {
        errors.push({
          type: 'result-type',
          message: `Local '${local.id}' in style '${styleName}' does not match its explicit type.`,
          styleId,
          localId: local.id,
          localNodeId: node.id,
          path: [...path],
        })
        break
      }
      try {
        frame.declare(local.id, 'const', evaluated.value)
      } catch (error) {
        errors.push({
          type: 'local',
          message: `Failed to declare local '${local.id}' in style '${styleName}'.`,
          styleId,
          localId: local.id,
          localNodeId: node.id,
          path: [...path],
          scriptError: {
            stage: 'runtime',
            message: error instanceof Error ? error.message : String(error),
          },
        })
        break
      }
    }

    return { context: localContext, errors }
  }

  const evaluateCondition = (
    condition: StyleElement.FormulaSource | undefined,
    context: FormulaContext.Value,
    styleId: string,
    styleName: string,
    referenceId: string,
    path: readonly string[],
  ): { apply: boolean; error?: Error } => {
    if (condition == null) return { apply: true }

    const result = FormulaEvaluator.evaluateExpression(condition.source, context)
    if (!result.ok) {
      return {
        apply: false,
        error: {
          type: 'condition',
          message: `Failed to evaluate the condition for style '${styleName}'.`,
          styleId,
          referenceId,
          path: [...path],
          scriptError: result.error,
        },
      }
    }
    if (typeof result.value !== 'boolean') {
      return {
        apply: false,
        error: {
          type: 'result-type',
          message: `The condition for style '${styleName}' must return boolean.`,
          styleId,
          referenceId,
          path: [...path],
        },
      }
    }
    return { apply: result.value }
  }

  const resolveArgument = (
    argument: StyleElement.Argument | undefined,
    parameter: StyleParameterCatalog.Parameter,
    callerParameters: Readonly<Record<string, unknown>>,
    context: FormulaContext.Value,
    styleId: string,
    styleName: string,
    referenceId: string,
    path: readonly string[],
  ): ResolvedValue => {
    const binding = argument?.binding
    let resolved: unknown

    if (binding == null) {
      return {
        ok: false,
        error: {
          type: 'structure',
          message: `Style '${styleName}' is missing argument '${parameter.id}'.`,
          styleId,
          referenceId,
          path: [...path],
          parameterId: parameter.parameterId,
          assertion: true,
        },
      }
    }
    if (binding.type === 'delegate') {
      resolved = callerParameters[parameter.id]
    } else if (binding.type === 'default') {
      resolved = parameter.defaultValue
    } else if (binding.value.type === 'literal') {
      resolved = binding.value.value
    } else {
      const result = FormulaEvaluator.evaluateExpression(binding.value.source, context)
      if (!result.ok) {
        return {
          ok: false,
          error: {
            type: 'parameter',
            message: `Failed to evaluate parameter '${parameter.id}' for style '${styleName}'.`,
            styleId,
            referenceId,
            path: [...path],
            parameterId: parameter.parameterId,
            scriptError: result.error,
          },
        }
      }
      resolved = result.value
    }

    if (!matchesType(resolved, parameter.valueType)) {
      return {
        ok: false,
        error: {
          type: 'result-type',
          message: `Parameter '${parameter.id}' for style '${styleName}' must resolve to ${parameter.valueType}.`,
          styleId,
          referenceId,
          path: [...path],
          parameterId: parameter.parameterId,
        },
      }
    }

    return { ok: true, value: resolved }
  }

  export const createCatalog = (
    rootNode: TreeNode.Node,
  ): Catalog => {
    const records = new Map<string, StyleRecord>()
    const collect = (node: TreeNode.Node) => {
      if (node.element.kind === 'style' && !records.has(node.element.styleId)) {
        records.set(node.element.styleId, {
          element: node.element,
          parameters: collectParameters(node),
          locals: collectLocals(node),
        })
      }
      node.children.forEach(collect)
    }
    collect(rootNode)

    const parameterCatalog = StyleParameterCatalog.createCatalog(rootNode)

    const resolveStyle = (
      styleId: string,
      parameters: Readonly<Record<string, unknown>>,
      globalContext: FormulaContext.Value,
      path: readonly string[],
      options: ResolveOptions,
    ): Result => {
      const nextPath = [...path, styleId]
      const nextPathNames = nextPath.map((id) => records.get(id)?.element.id ?? id)
      const record = records.get(styleId)
      if (record == null) {
        return {
          declarations: [],
          errors: [{
            type: 'structure',
            message: `Style '${styleId}' was not found.`,
            styleId,
            path: nextPathNames,
            assertion: true,
          }],
        }
      }
      if (path.includes(styleId)) {
        return {
          declarations: [],
          errors: [{
            type: 'structure',
            message: `Style inheritance cycle: ${nextPathNames.join(' -> ')}.`,
            styleId,
            path: nextPathNames,
            assertion: true,
          }],
        }
      }

      const parameterContext = createFormulaContext(globalContext, parameters)
      const declarations: Declaration[] = []
      const errors: Error[] = []
      const localsResult = resolveLocals(
        record.locals,
        parameterContext,
        rootNode,
        styleId,
        record.element.id,
        nextPathNames,
      )
      errors.push(...localsResult.errors)
      if (localsResult.errors.length > 0) return { declarations, errors }
      const context = localsResult.context

      record.element.bases.forEach((base) => {
        const resolution = parameterCatalog.resolve(base.styleId, nextPath)
        if (resolution.issues.length > 0) {
          resolution.issues.forEach((issue) => {
            errors.push({
              type: 'structure',
              message: issue.message,
              styleId: base.styleId,
              referenceId: base.referenceId,
              path: issue.path,
              assertion: true,
            })
          })
          return
        }
        const invariantError = StyleArgumentContract.getInvariantError(
          base.arguments,
          resolution.parameters,
          'inheritance',
        )
        if (invariantError != null) {
          errors.push({
            type: 'structure',
            message: `Style inheritance has invalid arguments for '${records.get(base.styleId)?.element.id ?? base.styleId}': ${invariantError}`,
            styleId: base.styleId,
            referenceId: base.referenceId,
            path: nextPathNames,
            assertion: true,
          })
          return
        }

        const condition = evaluateCondition(
          base.condition,
          context,
          base.styleId,
          records.get(base.styleId)?.element.id ?? base.styleId,
          base.referenceId,
          nextPathNames,
        )
        if (condition.error != null) errors.push(condition.error)
        if (!condition.apply) return

        const baseParameters: Record<string, unknown> = {}
        let isValid = true
        resolution.parameters.forEach((parameter) => {
          const argument = base.arguments.find((candidate) => (
            candidate.parameterId === parameter.parameterId
          ))
          const result = resolveArgument(
            argument,
            parameter,
            parameters,
            context,
            base.styleId,
            records.get(base.styleId)?.element.id ?? base.styleId,
            base.referenceId,
            nextPathNames,
          )
          if (!result.ok) {
            errors.push(result.error)
            isValid = false
            return
          }
          baseParameters[parameter.id] = result.value
        })
        if (!isValid) return

        const baseResult = resolveStyle(
          base.styleId,
          baseParameters,
          globalContext,
          nextPath,
          options,
        )
        declarations.push(...baseResult.declarations)
        errors.push(...baseResult.errors)
      })

      record.element.rules.forEach((rule) => {
        const evaluateDeclaration = (
          declaration: StyleElement.DeclarationRule,
          state: StyleElement.State | null,
        ) => {
          const appendDeclaration = (
            value: string,
            unresolved?: Declaration['unresolved'],
          ) => {
            if (
              unresolved == null
              && StyleValueSupport.check(declaration.property, value) === 'unsupported'
            ) {
              errors.push({
                type: 'css-value',
                message: `'${value}' is not supported for '${declaration.property}' in style '${record.element.id}'.`,
                styleId,
                path: nextPathNames,
                property: declaration.property,
              })
              return
            }
            declarations.push({
              property: declaration.property,
              value,
              state,
              unresolved,
              source: {
                styleId,
                path: [...nextPathNames],
                valueType: declaration.value.type,
              },
            })
          }

          if (declaration.value.type === 'literal') {
            appendDeclaration(declaration.value.value)
            return
          }

          const result = FormulaEvaluator.evaluateExpression(declaration.value.source, context)
          if (!result.ok) {
            const error = {
              type: 'formula',
              message: `Failed to evaluate '${declaration.property}' in style '${record.element.id}'.`,
              styleId,
              path: nextPathNames,
              property: declaration.property,
              scriptError: result.error,
            } satisfies Error
            errors.push(error)
            if (options.includeUnresolvedDeclarations === true) {
              appendDeclaration(declaration.value.source, {
                type: 'formula',
                source: declaration.value.source,
                message: error.message,
              })
            }
            return
          }
          if (typeof result.value !== 'string') {
            const error = {
              type: 'result-type',
              message: `'${declaration.property}' in style '${record.element.id}' must return string.`,
              styleId,
              path: nextPathNames,
              property: declaration.property,
            } satisfies Error
            errors.push(error)
            if (options.includeUnresolvedDeclarations === true) {
              appendDeclaration(declaration.value.source, {
                type: 'formula',
                source: declaration.value.source,
                message: error.message,
              })
            }
            return
          }
          appendDeclaration(result.value)
        }

        if (rule.type === 'declaration') {
          evaluateDeclaration(rule, null)
        } else {
          rule.declarations.forEach((declaration) => {
            evaluateDeclaration(declaration, rule.state)
          })
        }
      })

      return { declarations, errors }
    }

    const resolve = (
      applications: readonly TagElement.StyleApplication[],
      globalContext: FormulaContext.Value,
      options: ResolveOptions = {},
    ): Result => {
      const declarations: Declaration[] = []
      const errors: Error[] = []

      applications.forEach((application) => {
        const resolution = parameterCatalog.resolve(application.styleId)
        if (resolution.issues.length > 0) {
          resolution.issues.forEach((issue) => {
            errors.push({
              type: 'structure',
              message: issue.message,
              styleId: application.styleId,
              referenceId: application.referenceId,
              path: issue.path,
              assertion: true,
            })
          })
          return
        }
        const invariantError = StyleArgumentContract.getInvariantError(
          application.arguments,
          resolution.parameters,
          'application',
        )
        if (invariantError != null) {
          errors.push({
            type: 'structure',
            message: `Style application has invalid arguments for '${records.get(application.styleId)?.element.id ?? application.styleId}': ${invariantError}`,
            styleId: application.styleId,
            referenceId: application.referenceId,
            path: [],
            assertion: true,
          })
          return
        }

        const condition = evaluateCondition(
          application.condition,
          globalContext,
          application.styleId,
          records.get(application.styleId)?.element.id ?? application.styleId,
          application.referenceId,
          [],
        )
        if (condition.error != null) errors.push(condition.error)
        if (!condition.apply) return

        const parameters: Record<string, unknown> = {}
        let isValid = true
        resolution.parameters.forEach((parameter) => {
          const argument = application.arguments.find((candidate) => (
            candidate.parameterId === parameter.parameterId
          )) as StyleElement.Argument | undefined
          const result = resolveArgument(
            argument,
            parameter,
            globalContext.$param,
            globalContext,
            application.styleId,
            records.get(application.styleId)?.element.id ?? application.styleId,
            application.referenceId,
            [],
          )
          if (!result.ok) {
            errors.push(result.error)
            isValid = false
            return
          }
          parameters[parameter.id] = result.value
        })
        if (!isValid) return

        const result = resolveStyle(
          application.styleId,
          parameters,
          globalContext,
          [],
          options,
        )
        declarations.push(...result.declarations)
        errors.push(...result.errors)
      })

      return { declarations, errors }
    }

    return { resolve }
  }

  export const formatError = (
    error: Error,
  ): string => {
    const location = error.path.length === 0 ? error.styleId : error.path.join(' -> ')
    const script = error.scriptError == null
      ? ''
      : ` ${error.scriptError.stage === 'compile' ? 'TypeScript' : 'Runtime'}: ${error.scriptError.message}`
    return `${error.message} [${location}]${script}`
  }
}

export default StyleDeclarationResolver
