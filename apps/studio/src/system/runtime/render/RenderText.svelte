<script lang="ts">
  import type FormulaContext from '../formula/formula-context'
  import FormulaEvaluator from '../formula/formula-evaluator'
  import ScriptError from '../script/script-error'
  import RuntimeTree from '../runtime-tree'
  import RuntimeStateDependency from '../runtime-state-dependency'
  import type TreeNode from '../../tree/tree-node'

  type Props = {
    node: TreeNode.Node
    formulaContext: FormulaContext.Value
    renderRevision: number
    trackStateDependencies: RuntimeStateDependency.Tracker
  }

  let { node, formulaContext, renderRevision, trackStateDependencies }: Props = $props()

  const text = $derived(RuntimeTree.isTextNode(node) ? node.element : null)
  const value = $derived.by(() => {
    renderRevision
    return trackStateDependencies(() => {
    if (text == null) return ''
    if (text.source.type === 'literal') return text.source.value

    const result = FormulaEvaluator.evaluateExpression(
      text.source.source,
      formulaContext,
    )

    if (!result.ok) return `[${ScriptError.format(result.error)}]`
    if (result.value === undefined) return '[Formula Undefined]'
    if (result.value === null) return ''
    return String(result.value)
    })
  })
</script>

{value}
