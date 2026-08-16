<script lang="ts">
  import { untrack } from 'svelte'
  import RenderContent from './render/RenderContent.svelte'
  import FormulaContext from './formula/formula-context'
  import RuntimeState from './runtime-state'
  import RuntimeTree from './runtime-tree'
  import ScriptError from './script/script-error'
  import type TreeNode from '../tree/tree-node'
  import StyleElement from '../element/kind/view/style-element'
  import StyleResolver from './style/style-resolver'
  import RuntimeProps from './runtime-props'

  type Props = {
    appNode: TreeNode.Node
    projectNode: TreeNode.Node
  }

  let { appNode, projectNode }: Props = $props()

  let renderRevision = $state(0)
  let actionError = $state<{
    nodeId: number
    error: ScriptError.Value
  } | null>(null)
  let styleResults = $state<Record<number, StyleResolver.Result>>({})
  let dismissedStyleErrorNodeIds = $state<number[]>([])
  let runtimeStyleElement = $state<HTMLStyleElement | null>(null)

  const runtime = $derived(RuntimeTree.createAppRuntime(appNode, projectNode))
  const runtimeState = $derived(RuntimeState.createState(runtime))
  const entryComponentNode = $derived(RuntimeTree.getEntryComponentNode(runtime))
  const entryProps = $derived(
    entryComponentNode == null
      ? RuntimeProps.empty()
      : RuntimeProps.resolveEntry(
          runtime,
          entryComponentNode,
          FormulaContext.create({ $state: runtimeState }),
        ),
  )
  const formulaContext = $derived(FormulaContext.create({
    $state: runtimeState,
    $props: entryProps.values,
  }))
  const styleCatalog = $derived(StyleResolver.createCatalog(projectNode))
  const firstStyleError = $derived(Object.entries(styleResults)
    .flatMap(([nodeId, result]) => {
      const numericNodeId = Number(nodeId)
      if (dismissedStyleErrorNodeIds.includes(numericNodeId)) return []
      return result.errors.map((error) => ({ nodeId: numericNodeId, error }))
    })[0] ?? null)
  const runtimeStyleSheet = $derived.by(() => {
    const rules: string[] = []
    Object.entries(styleResults).forEach(([nodeId, result]) => {
      const states = [null, ...StyleElement.states] as const
      states.forEach((state) => {
        const style = document.createElement('div').style
        result.declarations
          .filter((declaration) => declaration.state === state)
          .forEach((declaration) => {
            style.setProperty(declaration.property, declaration.value)
          })
        if (style.length === 0) return

        const suffix = state == null ? '' : `:${state}`
        rules.push(`.mbc-runtime-node-${nodeId}${suffix} { ${style.cssText} }`)
      })
    })
    return rules.join('\n')
  })
  const rootViewNodes = $derived(entryComponentNode == null
    ? []
    : RuntimeTree.getComponentRootViewNodes(entryComponentNode))

  $effect(() => {
    if (runtimeStyleElement == null) return
    runtimeStyleElement.textContent = runtimeStyleSheet
  })

  const invalidateRuntime = () => {
    renderRevision += 1
  }

  const scriptErrorsEqual = (
    left: ScriptError.Value | undefined,
    right: ScriptError.Value | undefined,
  ): boolean => (
    left?.stage === right?.stage
    && left?.message === right?.message
    && left?.line === right?.line
    && left?.column === right?.column
  )

  const arraysEqual = <T,>(
    left: readonly T[],
    right: readonly T[],
    isEqual: (leftItem: T, rightItem: T) => boolean,
  ): boolean => (
    left.length === right.length
    && left.every((leftItem, index) => isEqual(leftItem, right[index]))
  )

  const styleSourcesEqual = (
    left: StyleResolver.DeclarationSource,
    right: StyleResolver.DeclarationSource,
  ): boolean => (
    left.styleId === right.styleId
    && left.valueType === right.valueType
    && arraysEqual(left.path, right.path, (leftItem, rightItem) => leftItem === rightItem)
  )

  const styleDeclarationsEqual = (
    left: StyleResolver.Declaration,
    right: StyleResolver.Declaration,
  ): boolean => (
    left.property === right.property
    && left.value === right.value
    && left.state === right.state
    && styleSourcesEqual(left.source, right.source)
  )

  const styleErrorsEqual = (
    left: StyleResolver.Error,
    right: StyleResolver.Error,
  ): boolean => (
    left.type === right.type
    && left.message === right.message
    && left.styleId === right.styleId
    && left.referenceId === right.referenceId
    && left.parameterId === right.parameterId
    && left.property === right.property
    && scriptErrorsEqual(left.scriptError, right.scriptError)
    && arraysEqual(left.path, right.path, (leftItem, rightItem) => leftItem === rightItem)
  )

  const styleResultsEqual = (
    left: StyleResolver.Result,
    right: StyleResolver.Result,
  ): boolean => (
    arraysEqual(left.declarations, right.declarations, styleDeclarationsEqual)
    && arraysEqual(left.errors, right.errors, styleErrorsEqual)
  )

  const isEmptyStyleResult = (
    result: StyleResolver.Result,
  ): boolean => result.declarations.length === 0 && result.errors.length === 0

  const setActionError = (
    nodeId: number,
    error: ScriptError.Value | null,
  ) => {
    const currentError = untrack(() => actionError)
    const nextError = error == null ? null : { nodeId, error }
    if (
      currentError?.nodeId === nextError?.nodeId
      && scriptErrorsEqual(currentError?.error, nextError?.error)
    ) return
    actionError = nextError
  }

  const setStyleResult = (
    nodeId: number,
    result: StyleResolver.Result | null,
  ) => {
    const currentResults = untrack(() => styleResults)
    if (result == null || isEmptyStyleResult(result)) {
      if (currentResults[nodeId] == null) return
      const nextResults = { ...currentResults }
      delete nextResults[nodeId]
      styleResults = nextResults
      return
    }
    if (
      currentResults[nodeId] != null
      && styleResultsEqual(currentResults[nodeId], result)
    ) return
    styleResults = { ...currentResults, [nodeId]: result }
  }
</script>

<div class="runtime-view">
  <style bind:this={runtimeStyleElement}></style>
  {#if actionError != null}
    <div class="runtime-error" role="alert">
      <span>{ScriptError.format(actionError.error)}</span>
      <button type="button" aria-label="Dismiss runtime error" onclick={() => actionError = null}>
        Close
      </button>
    </div>
  {:else if firstStyleError != null}
    <div class="runtime-error" role="alert">
      <span>{StyleResolver.formatError(firstStyleError.error)}</span>
      <button
        type="button"
        aria-label="Dismiss runtime error"
        onclick={() => {
          dismissedStyleErrorNodeIds = [
            ...dismissedStyleErrorNodeIds,
            firstStyleError.nodeId,
          ]
        }}
      >Close</button>
    </div>
  {/if}

  {#if runtime.entryNode == null}
    <div class="runtime-message">Entry is missing.</div>
  {:else if runtime.entryNode.element.kind === 'entry' && runtime.entryNode.element.componentId == null}
    <div class="runtime-message">Entry component is not selected.</div>
  {:else if entryComponentNode == null}
    <div class="runtime-message">Entry component was not found.</div>
  {:else if entryProps.errors.length > 0}
    <div class="runtime-message runtime-prop-error">{entryProps.errors[0]}</div>
  {:else if rootViewNodes.length === 0}
    <div class="runtime-message">Entry component has no elements.</div>
  {:else}
    <RenderContent hostNode={entryComponentNode} contentNodes={rootViewNodes}
      {projectNode} {styleCatalog}
      {formulaContext} {renderRevision} {invalidateRuntime}
      {setActionError} {setStyleResult} />
  {/if}
</div>

<style>
  .runtime-view {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
    padding: 0;
    box-sizing: border-box;
    background: #ffffff;
    color: #243f47;
    font-size: 0;
  }

  .runtime-view > :global(*) {
    vertical-align: top;
  }

  .runtime-message {
    display: inline-flex;
    align-items: center;
    margin: 18px;
    min-height: 34px;
    padding: 0 12px;
    border: 1px solid rgba(154, 203, 212, 0.68);
    border-radius: 6px;
    background: rgba(244, 251, 252, 0.9);
    color: #6d8990;
    font-size: 13px;
    font-weight: 700;
  }

  .runtime-prop-error {
    border-color: #d58e8e;
    background: rgba(255, 241, 241, 0.96);
    color: #833b3b;
  }

  .runtime-error {
    position: absolute;
    z-index: 2;
    right: 12px;
    bottom: 12px;
    left: 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-height: 36px;
    padding: 6px 8px 6px 12px;
    border: 1px solid #d58e8e;
    border-radius: 6px;
    background: rgba(255, 241, 241, 0.96);
    color: #833b3b;
    font-size: 12px;
    line-height: 1.4;
    box-sizing: border-box;
  }

  .runtime-error button {
    flex: 0 0 auto;
    height: 24px;
    padding: 0 9px;
    border: 1px solid #c77d7d;
    border-radius: 5px;
    background: #fffafa;
    color: #783737;
    font: inherit;
    font-weight: 700;
    cursor: default;
  }

  .runtime-error button:hover {
    background: #f9dddd;
  }
</style>
