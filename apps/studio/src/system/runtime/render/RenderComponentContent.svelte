<script lang="ts">
  import type FormulaContext from '../formula/formula-context'
  import RuntimePartialKey from '../partial/runtime-partial-key'
  import RuntimePartialRegistry from '../partial/runtime-partial-registry'
  import RuntimeStateDependency from '../runtime-state-dependency'
  import type RuntimeState from '../runtime-state'
  import ScriptError from '../script/script-error'
  import type ScriptErrorValue from '../script/script-error'
  import RuntimeTree from '../runtime-tree'
  import type StyleDeclarationResolver from '../style/style-declaration-resolver'
  import type TreeNode from '@system/model/tree/tree-node'
  import RenderContent from './RenderContent.svelte'
  import RenderEffects from '../effect/RenderEffects.svelte'

  type Props = {
    componentNode: TreeNode.Node
    projectNode: TreeNode.Node
    styleCatalog: StyleDeclarationResolver.Catalog
    formulaContext: FormulaContext.Value
    renderRevision: number
    invalidateRuntime: () => void
    trackStateDependencies: RuntimeStateDependency.Tracker
    invalidateStateDependencies: RuntimeState.WriteHandler
    setActionError: (nodeId: number, error: ScriptErrorValue.Value | null) => void
    setStyleResult: (instanceKey: string, nodeId: number, result: StyleDeclarationResolver.Result | null) => void
    componentStack: readonly number[]
    slotContents?: ReadonlyMap<string, TreeNode.Node>
    slotDefinitions?: ReadonlyMap<string, TreeNode.Node>
    slotCallerContext?: FormulaContext.Value
  }

  let {
    componentNode,
    projectNode,
    styleCatalog,
    formulaContext,
    renderRevision,
    invalidateRuntime,
    trackStateDependencies,
    invalidateStateDependencies,
    setActionError,
    setStyleResult,
    componentStack,
    slotContents,
    slotDefinitions,
    slotCallerContext,
  }: Props = $props()

  let partialRevision = $state(0)
  let partialRegistrationError = $state<ScriptErrorValue.Value | null>(null)
  const scopedRenderRevision = $derived(renderRevision + partialRevision)
  const rootViewNodes = $derived(RuntimeTree.getComponentRootViewNodes(componentNode))
  const partialKey = $derived(
    componentNode.element.kind === 'component' ? componentNode.element.partialKey : undefined,
  )
  const partialKeyResult = $derived.by(() => {
    scopedRenderRevision
    return trackStateDependencies(() => RuntimePartialKey.resolve(partialKey, formulaContext))
  })
  const runtimeError = $derived(partialKeyResult.error ?? partialRegistrationError)

  $effect(() => {
    setActionError(componentNode.id, runtimeError)
    return () => setActionError(componentNode.id, null)
  })

  $effect(() => {
    partialRegistrationError = null
    if (partialKeyResult.key == null) return

    return RuntimePartialRegistry.register(
      formulaContext.$invalidate,
      partialKeyResult.key,
      () => { partialRevision += 1 },
      (message) => {
        partialRegistrationError = message == null
          ? null
          : ScriptError.create('runtime', message)
      },
    )
  })
</script>

{#if runtimeError == null}
  <RenderContent
    hostNode={componentNode}
    contentNodes={rootViewNodes}
    {projectNode}
    {styleCatalog}
    {formulaContext}
    renderRevision={scopedRenderRevision}
    {invalidateRuntime}
    {trackStateDependencies}
    {invalidateStateDependencies}
    {setActionError}
    {setStyleResult}
    {componentStack}
    {slotContents}
    {slotDefinitions}
    {slotCallerContext}
  />
  {#key formulaContext.$state}
    <RenderEffects
      ownerNode={componentNode}
      {formulaContext}
      renderRevision={scopedRenderRevision}
      {trackStateDependencies}
      {setActionError}
    />
  {/key}
{/if}
