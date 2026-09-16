<script lang="ts">
  import type EffectElement from '../../element/kind/variable/store/effect-element'
  import type FormulaContext from '../formula/formula-context'
  import type ScriptError from '../script/script-error'
  import type TreeNode from '../../tree/tree-node'
  import type RuntimeStateDependency from '../runtime-state-dependency'
  import EffectRuntimeGuard from './effect-runtime-guard'
  import EffectRunner from './EffectRunner.svelte'
  import ScriptErrorValue from '../script/script-error'

  type Props = {
    ownerNode: TreeNode.Node
    formulaContext: FormulaContext.Value
    renderRevision: number
    trackStateDependencies: RuntimeStateDependency.Tracker
    setActionError: (nodeId: number, error: ScriptError.Value | null) => void
  }

  let {
    ownerNode,
    formulaContext,
    renderRevision,
    trackStateDependencies,
    setActionError,
  }: Props = $props()

  const guard = EffectRuntimeGuard.create()
  const effects = $derived(
    ownerNode.children
      .find((child) => child.element.kind === 'store')
      ?.children.find((child) => child.element.kind === 'effects')
      ?.children.filter((child): child is TreeNode.Node & { element: EffectElement.Element } => (
        child.element.kind === 'effect' && child.disabled !== true
      )) ?? [],
  )
  const duplicateMount = $derived(
    effects.filter((node) => node.element.trigger === 'mount')[1] ?? null,
  )
  const runnableEffects = $derived.by(() => {
    let mountFound = false
    return effects.filter((node) => {
      if (node.element.trigger !== 'mount') return true
      if (mountFound) return false
      mountFound = true
      return true
    })
  })

  $effect(() => {
    if (duplicateMount == null) return
    setActionError(
      duplicateMount.id,
      ScriptErrorValue.create('runtime', 'Effects can contain only one Mount Effect.'),
    )
    return () => setActionError(duplicateMount.id, null)
  })
</script>

{#each runnableEffects as effectNode (effectNode.id)}
  <EffectRunner
    node={effectNode}
    {formulaContext}
    {renderRevision}
    {trackStateDependencies}
    {setActionError}
    {guard}
  />
{/each}
