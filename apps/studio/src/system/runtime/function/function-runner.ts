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
import TransitionExecutor from '../transition/transition-executor'
import FunctionCodeEvaluator from './function-code-evaluator'
import RuntimeRefRegistry from '../ref/runtime-ref-registry'

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
  }

  type PromiseNode = TreeNode.Node & {
    element: Extract<TreeNode.Node['element'], { kind: 'promise' }>
  }

  const inspectStructure = (
    functionNode: TreeNode.Node,
  ): Structure | Failure => {
    if (functionNode.element.kind !== 'function') {
      return failure(functionNode.id, 'The target node is not a Function.')
    }
    const procedureNodes = functionNode.children.filter(
      (child) => child.element.kind === 'function-procedure',
    )
    const procedureNode = procedureNodes[0]
    if (procedureNode == null) {
      return failure(
        functionNode.id,
        `Function '${functionNode.element.id}' is not available for runtime execution.`,
      )
    }
    return { procedureNode }
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

  type ReturnSignal = {
    returned: true
    returnNode: FunctionReturnNode
    value: unknown
  }

  type ExecutionResult = Failure | ReturnSignal | null

  const findPromiseBranch = (
    promiseNode: PromiseNode,
    kind: 'promise-then' | 'promise-catch',
  ): TreeNode.Node | null => (
    promiseNode.children.find((child) => child.element.kind === kind) ?? null
  )

  const isPromiseLike = (
    value: unknown,
  ): value is PromiseLike<unknown> => value != null
    && (typeof value === 'object' || typeof value === 'function')
    && typeof (value as { then?: unknown }).then === 'function'

  const reportDetachedFailure = (
    context: FormulaContext.Value,
    result: Failure,
  ) => {
    if (context.reportError != null) {
      context.reportError(result.errorNodeId, result.error)
      return
    }
    console.error('[Mebaco runtime] Promise branch failed.', ScriptErrorValue.format(result.error))
  }

  const validatePromiseResult = (
    promiseNode: PromiseNode,
    value: unknown,
    projectNode: TreeNode.Node,
  ): Failure | null => {
    const resultType = promiseNode.element.resultType
    if (resultType == null) return null
    if (
      !(resultType.nullable && value === null)
      && !TypeValue.isCompatible(resultType.valueType, value, projectNode)
    ) {
      return failure(
        promiseNode.id,
        `Promise result '${promiseNode.element.id}' does not match its declared type.`,
      )
    }
    return null
  }

  const evaluateReturn = (
    returnNode: FunctionReturnNode,
    context: FormulaContext.Value,
  ): ReturnSignal | Failure => {
    const returnSource = returnNode.element.source ?? ''
    if (returnSource.trim().length === 0) {
      return { returned: true, returnNode, value: undefined }
    }
    const policyError = ScriptPolicy.validate(returnSource, {
      allowAwait: false,
    })[0]
    if (policyError != null) return failure(returnNode.id, policyError)
    const evaluated = FormulaEvaluator.evaluateExpression(returnSource, context)
    if (!evaluated.ok) return failure(returnNode.id, evaluated.error)
    return { returned: true, returnNode, value: evaluated.value }
  }

  const evaluateReturnAsync = async (
    returnNode: FunctionReturnNode,
    context: FormulaContext.Value,
  ): Promise<ReturnSignal | Failure> => {
    const returnSource = returnNode.element.source ?? ''
    if (returnSource.trim().length === 0) {
      return { returned: true, returnNode, value: undefined }
    }
    const policyError = ScriptPolicy.validate(returnSource, {
      allowAwait: true,
    })[0]
    if (policyError != null) return failure(returnNode.id, policyError)
    const evaluated = await FormulaEvaluator.evaluateExpressionAsync(returnSource, context)
    if (!evaluated.ok) return failure(returnNode.id, evaluated.error)
    return { returned: true, returnNode, value: evaluated.value }
  }

  const executeChildren = (
    children: readonly TreeNode.Node[],
    context: FormulaContext.Value,
    frame: VariableFrame.Frame,
    projectNode: TreeNode.Node,
  ): ExecutionResult => {
    for (const child of children) {
      if (child.disabled) continue
      if (child.element.kind === 'function-return') {
        return evaluateReturn(child as FunctionReturnNode, context)
      } else if (child.element.kind === 'control-conditional') {
        const selected = ConditionalResolver.resolve(child, context)
        if (selected.error != null) return failure(child.id, selected.error)
        if (selected.branchNode != null) {
          const branchResult = executeChildren(selected.branchNode.children, context, frame, projectNode)
          if (branchResult != null) return branchResult
        }
      } else if (child.element.kind === 'control-switch') {
        const selected = SwitchResolver.resolve(child, context, projectNode)
        if (selected.error != null) return failure(child.id, selected.error)
        if (selected.branchNode != null) {
          const branchResult = executeChildren(selected.branchNode.children, context, frame, projectNode)
          if (branchResult != null) return branchResult
        }
      } else if (child.element.kind === 'block') {
        const blockResult = executeChildren(child.children, context, frame, projectNode)
        if (blockResult != null) return blockResult
      } else if (child.element.kind === 'promise') {
        const promiseFailure = startPromise(
          child as PromiseNode,
          context,
          frame,
          projectNode,
          false,
        )
        if (promiseFailure != null) return promiseFailure
      } else if (child.element.kind === 'transition') {
        const executed = TransitionExecutor.execute(child.id, child.element, context, projectNode)
        if (!executed.ok) return failure(child.id, executed.error)
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
  ): Promise<ExecutionResult> => {
    for (const child of children) {
      if (child.disabled) continue
      if (child.element.kind === 'function-return') {
        return evaluateReturnAsync(child as FunctionReturnNode, context)
      } else if (child.element.kind === 'control-conditional') {
        const selected = ConditionalResolver.resolve(child, context)
        if (selected.error != null) return failure(child.id, selected.error)
        if (selected.branchNode != null) {
          const branchResult = await executeChildrenAsync(selected.branchNode.children, context, frame, projectNode)
          if (branchResult != null) return branchResult
        }
      } else if (child.element.kind === 'control-switch') {
        const selected = SwitchResolver.resolve(child, context, projectNode)
        if (selected.error != null) return failure(child.id, selected.error)
        if (selected.branchNode != null) {
          const branchResult = await executeChildrenAsync(selected.branchNode.children, context, frame, projectNode)
          if (branchResult != null) return branchResult
        }
      } else if (child.element.kind === 'block') {
        const blockResult = await executeChildrenAsync(
          child.children,
          context,
          frame,
          projectNode,
        )
        if (blockResult != null) return blockResult
      } else if (child.element.kind === 'promise') {
        const promiseFailure = startPromise(
          child as PromiseNode,
          context,
          frame,
          projectNode,
          true,
        )
        if (promiseFailure != null) return promiseFailure
      } else if (child.element.kind === 'transition') {
        const executed = TransitionExecutor.execute(child.id, child.element, context, projectNode)
        if (!executed.ok) return failure(child.id, executed.error)
      } else if (child.element.kind === 'variable') {
        const policyError = ScriptPolicy.validate(child.element.source, {
          allowAwait: true,
        })[0]
        if (policyError != null) return failure(child.id, policyError)
        const evaluated = await FormulaEvaluator.evaluateExpressionAsync(
          child.element.source,
          context,
        )
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

  const executePromiseBranch = async (
    promiseNode: PromiseNode,
    branchNode: TreeNode.Node,
    context: FormulaContext.Value,
    capturedFrame: VariableFrame.Frame,
    projectNode: TreeNode.Node,
    asyncProcedure: boolean,
    binding: { id: string; value: unknown } | null,
  ): Promise<void> => {
    const transaction = RuntimeRefRegistry.beginAction(context.$system, promiseNode.id)
    const branchFrame = VariableFrame.createLinked(capturedFrame.values)
    if (binding != null) {
      try {
        branchFrame.declare(binding.id, 'const', binding.value)
      } catch (error) {
        reportDetachedFailure(context, failure(branchNode.id, error))
        transaction.complete(false)
        return
      }
    }
    const branchContext = FormulaContextValue.create({
      ...context,
      $var: branchFrame.values,
    })
    branchContext.$fn = createNamespace(projectNode, branchNode.id, branchContext)
    const result = asyncProcedure
      ? await executeChildrenAsync(
          branchNode.children,
          branchContext,
          branchFrame,
          projectNode,
        )
      : executeChildren(
          branchNode.children,
          branchContext,
          branchFrame,
          projectNode,
        )
    if (result == null) {
      transaction.complete(true)
      context.requestRender?.()
      return
    }
    transaction.complete(false)
    if ('ok' in result) {
      reportDetachedFailure(context, result)
      context.requestRender?.()
      return
    }
    reportDetachedFailure(context, failure(
      result.returnNode.id,
      'Return is not allowed inside a Promise Then or Catch branch.',
    ))
    context.requestRender?.()
  }

  const startPromise = (
    promiseNode: PromiseNode,
    context: FormulaContext.Value,
    frame: VariableFrame.Frame,
    projectNode: TreeNode.Node,
    asyncProcedure: boolean,
  ): Failure | null => {
    const policyError = ScriptPolicy.validate(promiseNode.element.source, {
      allowAwait: false,
    })[0]
    if (policyError != null) return failure(promiseNode.id, policyError)

    const evaluated = FormulaEvaluator.evaluateExpression(
      promiseNode.element.source,
      context,
    )
    if (!evaluated.ok) return failure(promiseNode.id, evaluated.error)
    if (!isPromiseLike(evaluated.value)) {
      return failure(promiseNode.id, 'Promise expression must return a Promise.')
    }

    const thenNode = findPromiseBranch(promiseNode, 'promise-then')
    if (thenNode == null) return failure(promiseNode.id, 'Promise requires one Then branch.')
    const catchNode = findPromiseBranch(promiseNode, 'promise-catch')

    void Promise.resolve(evaluated.value).then(
      async (value) => {
        const typeFailure = validatePromiseResult(promiseNode, value, projectNode)
        if (typeFailure != null) {
          reportDetachedFailure(context, typeFailure)
          return
        }
        await executePromiseBranch(
          promiseNode,
          thenNode,
          context,
          frame,
          projectNode,
          asyncProcedure,
          promiseNode.element.resultType == null
            ? null
            : { id: promiseNode.element.id, value },
        )
      },
      async (error) => {
        if (catchNode == null || catchNode.element.kind !== 'promise-catch') {
          reportDetachedFailure(context, failure(promiseNode.id, error))
          return
        }
        await executePromiseBranch(
          promiseNode,
          catchNode,
          context,
          frame,
          projectNode,
          asyncProcedure,
          { id: catchNode.element.id, value: error },
        )
      },
    ).catch((error: unknown) => {
      reportDetachedFailure(context, failure(promiseNode.id, error))
    })

    return null
  }

  const validateReturnValue = (
    functionNode: TreeNode.Node,
    errorNodeId: number,
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
      return failure(errorNodeId, `Function '${functionNode.element.id}' returned an incompatible value.`)
    }
    return { ok: true, value }
  }

  export const createNamespace = (
    projectNode: TreeNode.Node,
    targetNodeId: number,
    definitionContext: FormulaContext.Value,
  ): Record<string, (...args: unknown[]) => unknown> => {
    const namespace: Record<string, (...args: unknown[]) => unknown> = {
      ...definitionContext.$fn as Record<string, (...args: unknown[]) => unknown>,
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
    if (FunctionDefinition.resolveSignature(projectNode, functionNode.element) == null) {
      return failure(functionNode.id, `Function '${functionNode.element.id}' has no valid Signature.`)
    }

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
      $fn: definitionContext.$fn,
    })
    context.$fn = createNamespace(projectNode, functionNode.id, context)

    if (functionNode.element.implementation.mode === 'code') {
      const source = functionNode.element.implementation.source
      const policyError = ScriptPolicy.validate(source, { allowAwait: false })[0]
      if (policyError != null) return failure(functionNode.id, policyError)
      const evaluated = FunctionCodeEvaluator.evaluate(
        source,
        parameters.map((parameter) => parameter.id),
        context,
      )
      if (!evaluated.ok) return failure(functionNode.id, evaluated.error)
      return validateReturnValue(functionNode, functionNode.id, evaluated.value, projectNode)
    }

    const structure = inspectStructure(functionNode)
    if ('ok' in structure) return structure
    const { procedureNode } = structure
    context.$fn = createNamespace(projectNode, procedureNode.id, context)

    const executionResult = executeChildren(
      procedureNode.children,
      context,
      frame,
      projectNode,
    )
    if (executionResult != null) {
      if ('ok' in executionResult) return executionResult
      return validateReturnValue(
        functionNode,
        executionResult.returnNode.id,
        executionResult.value,
        projectNode,
      )
    }
    return validateReturnValue(functionNode, functionNode.id, undefined, projectNode)
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
    if (FunctionDefinition.resolveSignature(projectNode, functionNode.element) == null) {
      return failure(functionNode.id, `Function '${functionNode.element.id}' has no valid Signature.`)
    }

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
      $fn: definitionContext.$fn,
    })
    context.$fn = createNamespace(projectNode, functionNode.id, context)

    if (functionNode.element.implementation.mode === 'code') {
      const source = functionNode.element.implementation.source
      const policyError = ScriptPolicy.validate(source, { allowAwait: true })[0]
      if (policyError != null) return failure(functionNode.id, policyError)
      const evaluated = await FunctionCodeEvaluator.evaluateAsync(
        source,
        parameters.map((parameter) => parameter.id),
        context,
      )
      if (!evaluated.ok) return failure(functionNode.id, evaluated.error)
      return validateReturnValue(functionNode, functionNode.id, evaluated.value, projectNode)
    }

    const structure = inspectStructure(functionNode)
    if ('ok' in structure) return structure
    const { procedureNode } = structure
    context.$fn = createNamespace(projectNode, procedureNode.id, context)

    const executionResult = await executeChildrenAsync(
      procedureNode.children,
      context,
      frame,
      projectNode,
    )
    if (executionResult != null) {
      if ('ok' in executionResult) return executionResult
      return validateReturnValue(
        functionNode,
        executionResult.returnNode.id,
        executionResult.value,
        projectNode,
      )
    }
    return validateReturnValue(functionNode, functionNode.id, undefined, projectNode)
  }
}

export default FunctionRunner
