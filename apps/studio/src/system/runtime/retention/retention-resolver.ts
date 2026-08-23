import type FormulaContext from '../formula/formula-context'
import type ScriptError from '../script/script-error'
import type TreeNode from '../../tree/tree-node'
import ActionEvaluator from '../action/action-evaluator'
import FormulaContextValue from '../formula/formula-context'
import FormulaEvaluator from '../formula/formula-evaluator'
import ScriptErrorValue from '../script/script-error'
import TypeValue from '../type-value'
import VariableFrame from '../variable/variable-frame'
import ContentHost from '../../element/content-host'
import FunctionRunner from '../function/function-runner'
import ConditionalResolver from '../conditional/conditional-resolver'
import SwitchResolver from '../switch/switch-resolver'
import TransitionExecutor from '../transition/transition-executor'

namespace RetentionResolver {
  export type Result = {
    context: FormulaContext.Value
    error: ScriptError.Value | null
    errorNodeId: number | null
  }

  export const resolve = (
    hostNode: TreeNode.Node,
    context: FormulaContext.Value,
    projectNode: TreeNode.Node,
  ): Result => {
    const frame = VariableFrame.create(context.$var)
    const nextContext = FormulaContextValue.create({ ...context, $var: frame.values })
    const retentionNode = ContentHost.getRetentionNode(hostNode)
    nextContext.$function = FunctionRunner.createNamespace(
      projectNode,
      retentionNode?.id ?? hostNode.id,
      nextContext,
    )
    if (retentionNode == null) {
      return { context: nextContext, error: null, errorNodeId: null }
    }

    const resolveChildren = (children: readonly TreeNode.Node[]): Result | null => {
      for (const child of children) {
        if (child.disabled) continue
        if (child.element.kind === 'control-conditional') {
          const selected = ConditionalResolver.resolve(child, nextContext)
          if (selected.error != null) {
            return { context: nextContext, error: selected.error, errorNodeId: child.id }
          }
          if (selected.branchNode != null) {
            const result = resolveChildren(selected.branchNode.children)
            if (result != null) return result
          }
          continue
        }
        if (child.element.kind === 'control-switch') {
          const selected = SwitchResolver.resolve(child, nextContext, projectNode)
          if (selected.error != null) {
            return { context: nextContext, error: selected.error, errorNodeId: child.id }
          }
          if (selected.branchNode != null) {
            const result = resolveChildren(selected.branchNode.children)
            if (result != null) return result
          }
          continue
        }
        if (child.element.kind === 'block') {
          const result = resolveChildren(child.children)
          if (result != null) return result
          continue
        }

        if (child.element.kind === 'transition') {
          const executed = TransitionExecutor.execute(
            child.element,
            nextContext,
            projectNode,
          )
          if (!executed.ok) {
            return { context: nextContext, error: executed.error, errorNodeId: child.id }
          }
          continue
        }

      if (child.element.kind === 'variable') {
        const evaluated = FormulaEvaluator.evaluateExpression(child.element.source, nextContext)
        if (!evaluated.ok) {
          return { context: nextContext, error: evaluated.error, errorNodeId: child.id }
        }
        if (
          child.element.typeSetting.type === 'explicit'
          && !(
            child.element.typeSetting.nullable && evaluated.value === null
          )
          && !TypeValue.isCompatible(
            child.element.typeSetting.valueType,
            evaluated.value,
            projectNode,
          )
        ) {
          return {
            context: nextContext,
            error: ScriptErrorValue.create(
              'runtime',
              `Variable '${child.element.id}' does not match its explicit type.`,
            ),
            errorNodeId: child.id,
          }
        }
        try {
          frame.declare(child.element.id, child.element.binding, evaluated.value)
        } catch (error) {
          return {
            context: nextContext,
            error: ScriptErrorValue.fromUnknown('runtime', error),
            errorNodeId: child.id,
          }
        }
      } else if (child.element.kind === 'action') {
        const executed = ActionEvaluator.executeScript(child.element.source, nextContext)
        if (!executed.ok) {
          return { context: nextContext, error: executed.error, errorNodeId: child.id }
        }
      }
      }
      return null
    }

    const errorResult = resolveChildren(retentionNode.children)
    if (errorResult != null) return errorResult
    return { context: nextContext, error: null, errorNodeId: null }
  }
}
export default RetentionResolver
