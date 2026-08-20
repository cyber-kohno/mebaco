import type FormulaContext from '../formula/formula-context'
import type ScriptError from '../script/script-error'
import type TreeNode from '../../tree/tree-node'
import ActionEvaluator from '../action/action-evaluator'
import FormulaContextValue from '../formula/formula-context'
import FormulaEvaluator from '../formula/formula-evaluator'
import FunctionScope from '../../element/kind/function/function-scope'
import ScriptErrorValue from '../script/script-error'
import TypeValue from '../type-value'
import VariableFrame from '../variable/variable-frame'
import ScriptPolicy from '../script/script-policy'
import ConditionalResolver from '../conditional/conditional-resolver'
import SwitchResolver from '../switch/switch-resolver'
import FunctionDefinition from '../../element/kind/function/function-definition'

namespace FunctionRunner {
  export type Success = {
    ok: true
    value: unknown
  }

  export type Failure = {
    ok: false
    error: ScriptError.Value
    errorNodeId: number
  }

  export type Result = Success | Failure

  const failure = (
    nodeId: number,
    error: unknown,
  ): Failure => ({
    ok: false,
    error: error != null
      && typeof error === 'object'
      && 'stage' in error
      && 'message' in error
      ? error as ScriptError.Value
      : ScriptErrorValue.fromUnknown('runtime', error),
    errorNodeId: nodeId,
  })

  type FunctionReturnNode = TreeNode.Node & {
    element: Extract<TreeNode.Node['element'], { kind: 'function-return' }>
  }

  type Structure = {
    procedureNode: TreeNode.Node
    returnNode: FunctionReturnNode
  }

  const inspectStructure = (
    functionNode: TreeNode.Node,
    projectNode: TreeNode.Node,
  ): Structure | Failure => {
    if (functionNode.element.kind !== 'function') {
      return failure(functionNode.id, 'The target node is not a Function.')
    }
    const argumentsNodes = functionNode.children.filter(
      (child) => child.element.kind === 'function-arguments',
    )
    const procedureNodes = functionNode.children.filter(
      (child) => child.element.kind === 'function-procedure',
    )
    const procedureNode = procedureNodes[0]
    const returnNode = procedureNode?.children.at(-1)
    if (
      (functionNode.element.mode === 'inline' && argumentsNodes[0] == null)
      || (functionNode.element.mode === 'refer'
        && FunctionDefinition.resolveSignature(projectNode, functionNode.element) == null)
      || procedureNode == null
      || returnNode?.element.kind !== 'function-return'
    ) {
      return failure(
        functionNode.id,
        `Function '${functionNode.element.id}' is not available for runtime execution.`,
      )
    }
    return { procedureNode, returnNode: returnNode as FunctionReturnNode }
  }

  const validateArguments = (
    functionNode: TreeNode.Node,
    values: readonly unknown[],
    projectNode: TreeNode.Node,
  ): Failure | null => {
    const parameters = FunctionScope.getArguments(projectNode, functionNode)
    if (parameters.length !== values.length) {
      return failure(
        functionNode.id,
        `Function '${functionNode.element.kind === 'function' ? functionNode.element.id : ''}' expects ${parameters.length} argument(s), but received ${values.length}.`,
      )
    }
    for (let index = 0; index < parameters.length; index += 1) {
      const parameter = parameters[index]
      const value = values[index]
      if (
        !(parameter.nullable && value === null)
        && !TypeValue.isCompatible(parameter.valueType, value, projectNode)
      ) {
        return failure(
          functionNode.id,
          `Argument '${parameter.id}' does not match its declared type.`,
        )
      }
    }
    return null
  }

  const executeChildren = (
    children: readonly TreeNode.Node[],
    context: FormulaContext.Value,
    frame: VariableFrame.Frame,
    projectNode: TreeNode.Node,
  ): Failure | null => {
    for (const child of children) {
      if (child.disabled) continue
      if (child.element.kind === 'control-conditional') {
        const selected = ConditionalResolver.resolve(child, context)
        if (selected.error != null) return failure(child.id, selected.error)
        if (selected.branchNode != null) {
          const branchFailure = executeChildren(selected.branchNode.children, context, frame, projectNode)
          if (branchFailure != null) return branchFailure
        }
      } else if (child.element.kind === 'control-switch') {
        const selected = SwitchResolver.resolve(child, context, projectNode)
        if (selected.error != null) return failure(child.id, selected.error)
        if (selected.branchNode != null) {
          const branchFailure = executeChildren(selected.branchNode.children, context, frame, projectNode)
          if (branchFailure != null) return branchFailure
        }
      } else if (child.element.kind === 'block') {
        const blockFailure = executeChildren(child.children, context, frame, projectNode)
        if (blockFailure != null) return blockFailure
      } else if (child.element.kind === 'variable') {
        const policyError = ScriptPolicy.validate(child.element.source, {
          allowAwait: false,
        })[0]
        if (policyError != null) return failure(child.id, policyError)
        const evaluated = FormulaEvaluator.evaluateExpression(child.element.source, context)
        if (!evaluated.ok) return failure(child.id, evaluated.error)
        if (
          child.element.typeSetting.type === 'explicit'
          && !(child.element.typeSetting.nullable && evaluated.value === null)
          && !TypeValue.isCompatible(
            child.element.typeSetting.valueType,
            evaluated.value,
            projectNode,
          )
        ) {
          return failure(
            child.id,
            `Variable '${child.element.id}' does not match its explicit type.`,
          )
        }
        try {
          frame.declare(child.element.id, child.element.binding, evaluated.value)
        } catch (error) {
          return failure(child.id, error)
        }
      } else if (child.element.kind === 'action') {
        const executed = ActionEvaluator.executeScript(child.element.source, context, {
          allowAwait: false,
          forbidReturn: true,
        })
        if (!executed.ok) return failure(child.id, executed.error)
      }
    }
    return null
  }

  const executeChildrenAsync = async (
    children: readonly TreeNode.Node[],
    context: FormulaContext.Value,
    frame: VariableFrame.Frame,
    projectNode: TreeNode.Node,
  ): Promise<Failure | null> => {
    for (const child of children) {
      if (child.disabled) continue
      if (child.element.kind === 'control-conditional') {
        const selected = ConditionalResolver.resolve(child, context)
        if (selected.error != null) return failure(child.id, selected.error)
        if (selected.branchNode != null) {
          const branchFailure = await executeChildrenAsync(selected.branchNode.children, context, frame, projectNode)
          if (branchFailure != null) return branchFailure
        }
      } else if (child.element.kind === 'control-switch') {
        const selected = SwitchResolver.resolve(child, context, projectNode)
        if (selected.error != null) return failure(child.id, selected.error)
        if (selected.branchNode != null) {
          const branchFailure = await executeChildrenAsync(selected.branchNode.children, context, frame, projectNode)
          if (branchFailure != null) return branchFailure
        }
      } else if (child.element.kind === 'block') {
        const blockFailure = await executeChildrenAsync(
          child.children,
          context,
          frame,
          projectNode,
        )
        if (blockFailure != null) return blockFailure
      } else if (child.element.kind === 'variable') {
        const policyError = ScriptPolicy.validate(child.element.source, {
          allowAwait: false,
        })[0]
        if (policyError != null) return failure(child.id, policyError)
        const evaluated = FormulaEvaluator.evaluateExpression(child.element.source, context)
        if (!evaluated.ok) return failure(child.id, evaluated.error)
        if (
          child.element.typeSetting.type === 'explicit'
          && !(child.element.typeSetting.nullable && evaluated.value === null)
          && !TypeValue.isCompatible(
            child.element.typeSetting.valueType,
            evaluated.value,
            projectNode,
          )
        ) {
          return failure(
            child.id,
            `Variable '${child.element.id}' does not match its explicit type.`,
          )
        }
        try {
          frame.declare(child.element.id, child.element.binding, evaluated.value)
        } catch (error) {
          return failure(child.id, error)
        }
      } else if (child.element.kind === 'action') {
        const executed = await ActionEvaluator.executeScriptAsync(
          child.element.source,
          context,
        )
        if (!executed.ok) return failure(child.id, executed.error)
      }
    }
    return null
  }

  const validateReturnValue = (
    functionNode: TreeNode.Node,
    returnNode: TreeNode.Node,
    value: unknown,
    projectNode: TreeNode.Node,
  ): Result => {
    if (functionNode.element.kind !== 'function') {
      return failure(functionNode.id, 'The target node is not a Function.')
    }
    const returnType = FunctionDefinition.getReturnType(projectNode, functionNode.element)
    if (returnType == null) {
      return { ok: true, value: undefined }
    }
    if (
      !(returnType.nullable && value === null)
      && !TypeValue.isCompatible(
        returnType.valueType,
        value,
        projectNode,
      )
    ) {
      return failure(returnNode.id, `Function '${functionNode.element.id}' returned an incompatible value.`)
    }
    return { ok: true, value }
  }

  export const createNamespace = (
    projectNode: TreeNode.Node,
    targetNodeId: number,
    definitionContext: FormulaContext.Value,
  ): Record<string, (...args: unknown[]) => unknown> => {
    const namespace: Record<string, (...args: unknown[]) => unknown> = {
      ...definitionContext.$function as Record<string, (...args: unknown[]) => unknown>,
    }
    FunctionScope.collectDefinedFunctions(projectNode, targetNodeId).forEach((entry) => {
      namespace[entry.element.id] = FunctionDefinition.getAsync(projectNode, entry.element)
        ? async (...args: unknown[]) => {
            const result = await runAsync(entry.node, args, definitionContext, projectNode)
            if (!result.ok) throw new Error(result.error.message)
            return result.value
          }
        : (...args: unknown[]) => {
            const result = run(entry.node, args, definitionContext, projectNode)
            if (!result.ok) throw new Error(result.error.message)
            return result.value
          }
    })
    return namespace
  }

  export const run = (
    functionNode: TreeNode.Node,
    argumentValues: readonly unknown[],
    definitionContext: FormulaContext.Value,
    projectNode: TreeNode.Node,
  ): Result => {
    if (functionNode.element.kind !== 'function') {
      return failure(functionNode.id, 'The target node is not a Function.')
    }
    if (FunctionDefinition.getAsync(projectNode, functionNode.element)) {
      return failure(functionNode.id, `Async Function '${functionNode.element.id}' is not available yet.`)
    }

    const structure = inspectStructure(functionNode, projectNode)
    if ('ok' in structure) return structure
    const { procedureNode, returnNode } = structure
    const argumentFailure = validateArguments(functionNode, argumentValues, projectNode)
    if (argumentFailure != null) return argumentFailure

    const parameters = FunctionScope.getArguments(projectNode, functionNode)
    const args = Object.fromEntries(parameters.map((parameter, index) => (
      [parameter.id, argumentValues[index]]
    )))
    const frame = VariableFrame.createLinked(definitionContext.$var)
    const context = FormulaContextValue.create({
      ...definitionContext,
      $args: args,
      $var: frame.values,
      $function: definitionContext.$function,
    })
    context.$function = createNamespace(projectNode, procedureNode.id, context)

    const executionFailure = executeChildren(
      procedureNode.children,
      context,
      frame,
      projectNode,
    )
    if (executionFailure != null) return executionFailure

    let value: unknown = undefined
    const returnSource = returnNode.element.source ?? ''
    if (returnSource.trim().length > 0) {
      const policyError = ScriptPolicy.validate(returnSource, {
        allowAwait: false,
      })[0]
      if (policyError != null) return failure(returnNode.id, policyError)
      const evaluated = FormulaEvaluator.evaluateExpression(returnSource, context)
      if (!evaluated.ok) return failure(returnNode.id, evaluated.error)
      value = evaluated.value
    }

    return validateReturnValue(functionNode, returnNode, value, projectNode)
  }

  export const runAsync = async (
    functionNode: TreeNode.Node,
    argumentValues: readonly unknown[],
    definitionContext: FormulaContext.Value,
    projectNode: TreeNode.Node,
  ): Promise<Result> => {
    if (functionNode.element.kind !== 'function') {
      return failure(functionNode.id, 'The target node is not a Function.')
    }
    if (!FunctionDefinition.getAsync(projectNode, functionNode.element)) {
      return run(functionNode, argumentValues, definitionContext, projectNode)
    }

    const structure = inspectStructure(functionNode, projectNode)
    if ('ok' in structure) return structure
    const { procedureNode, returnNode } = structure
    const argumentFailure = validateArguments(functionNode, argumentValues, projectNode)
    if (argumentFailure != null) return argumentFailure

    const parameters = FunctionScope.getArguments(projectNode, functionNode)
    const args = Object.fromEntries(parameters.map((parameter, index) => (
      [parameter.id, argumentValues[index]]
    )))
    const frame = VariableFrame.createLinked(definitionContext.$var)
    const context = FormulaContextValue.create({
      ...definitionContext,
      $args: args,
      $var: frame.values,
      $function: definitionContext.$function,
    })
    context.$function = createNamespace(projectNode, procedureNode.id, context)

    const executionFailure = await executeChildrenAsync(
      procedureNode.children,
      context,
      frame,
      projectNode,
    )
    if (executionFailure != null) return executionFailure

    let value: unknown = undefined
    const returnSource = returnNode.element.source ?? ''
    if (returnSource.trim().length > 0) {
      const evaluated = await FormulaEvaluator.evaluateExpressionAsync(
        returnSource,
        context,
      )
      if (!evaluated.ok) return failure(returnNode.id, evaluated.error)
      value = evaluated.value
    }
    return validateReturnValue(functionNode, returnNode, value, projectNode)
  }
}

export default FunctionRunner
