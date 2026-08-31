<script lang="ts">
  import { untrack } from 'svelte'
  import RenderContent from '../render/RenderContent.svelte'
  import FormulaContext from '../formula/formula-context'
  import RuntimeState from '../runtime-state'
  import RuntimeTree from '../runtime-tree'
  import ScriptError from '../script/script-error'
  import type TreeNode from '../../tree/tree-node'
  import StyleElement from '../../element/kind/view/style/style-element'
  import StyleDeclarationResolver from '../style/style-declaration-resolver'
  import RuntimeProps from '../runtime-props'
  import RuntimeLaunch from '../runtime-launch'
  import type AppElement from '../../element/kind/app/app-element'
  import RuntimeRefRegistry from '../ref/runtime-ref-registry'
  import PreviewController from '../preview/preview-controller'
  import FunctionRunner from '../function/function-runner'
  import RuntimeErrorScreen from './RuntimeErrorScreen.svelte'
  import RuntimeError from './runtime-error'
  import TransitionNamespace from '../transition/transition-namespace'

  type Props = {
    appNode: TreeNode.Node
    projectNode: TreeNode.Node
    launcherId?: string
    launchValues?: Readonly<Record<string, unknown>>
  }

  let { appNode, projectNode, launcherId, launchValues }: Props = $props()

  let renderRevision = $state(0)
  let actionError = $state<{
    nodeId: number
    error: ScriptError.Value
  } | null>(null)
  // Once a runtime failure is observed, keep the failure latched. Rendering the
  // error screen unmounts renderers, whose cleanup effects report null; clearing
  // the failure here would remount them and create an update loop.
  let runtimeFailure = $state<RuntimeError.Failure | null>(null)
  let transitionRequested = $state(false)
  let styleResults = $state<Record<number, StyleDeclarationResolver.Result>>({})
  let dismissedStyleErrorNodeIds = $state<number[]>([])
  let runtimeStyleElement = $state<HTMLStyleElement | null>(null)
  const requestTransition: FormulaContext.TransitionRequest = (appDefinitionId, values) => {
    if (transitionRequested) return
    transitionRequested = true
    queueMicrotask(() => {
      if (!PreviewController.transition(projectNode, appDefinitionId, values)) {
        transitionRequested = false
      }
    })
  }
  const runtimeSystem = RuntimeRefRegistry.createSystem({
    requestRender: () => invalidateRuntime(),
    reportError: (nodeId, error) => setActionError(nodeId, error),
  })
  const runtimeTransition = $derived(TransitionNamespace.create(
    projectNode,
    appNode,
    requestTransition,
  ))

  const runtime = $derived(RuntimeTree.createAppRuntime(appNode, projectNode))
  const runtimeState = $derived(RuntimeState.createState(
    runtime,
    launchValues == null ? {} : { ...launchValues },
  ))
  const entryComponentNode = $derived(RuntimeTree.getEntryComponentNode(runtime))
  const baseFormulaContext = $derived(FormulaContext.create({
    $state: runtimeState,
    $system: runtimeSystem,
    $transition: runtimeTransition,
    requestTransition,
    reportError: (nodeId, error) => setActionError(nodeId, error),
    requestRender: () => invalidateRuntime(),
  }))
  const launchResult = $derived(RuntimeLaunch.resolve({
    appNode: appNode as TreeNode.Node & { element: AppElement.Element },
    projectNode,
    launcherId,
    launchValues,
    baseContext: baseFormulaContext,
  }))
  const effectiveRuntimeState = $derived(RuntimeState.createState(runtime, launchResult.values))
  const appFormulaContext = $derived.by(() => {
    const context = FormulaContext.create({
      ...baseFormulaContext,
      $launch: launchResult.values,
      $state: effectiveRuntimeState,
      $system: runtimeSystem,
    })
    context.$fn = FunctionRunner.createNamespace(
      projectNode,
      appNode.id,
      context,
    )
    return context
  })
  const entryProps = $derived(
    entryComponentNode == null
      ? RuntimeProps.empty()
      : RuntimeProps.resolveEntry(
          runtime,
          entryComponentNode,
          appFormulaContext,
        ),
  )
  const formulaContext = $derived.by(() => {
    const context = FormulaContext.create({
      ...appFormulaContext,
      $props: entryProps.values,
    })
    context.$fn = FunctionRunner.createNamespace(
      projectNode,
      entryComponentNode?.id ?? appNode.id,
      context,
    )
    return context
  })

  $effect(() => {
    appNode.id
    transitionRequested = false
  })
  const styleCatalog = $derived(StyleDeclarationResolver.createCatalog(projectNode))
  const firstStyleError = $derived(Object.entries(styleResults)
    .flatMap(([nodeId, result]) => {
      const numericNodeId = Number(nodeId)
      if (dismissedStyleErrorNodeIds.includes(numericNodeId)) return []
      return result.errors.map((error) => ({ nodeId: numericNodeId, error }))
    })[0] ?? null)
  const derivedRuntimeFailure = $derived.by(() => {
    if (launchResult.errors.length > 0) {
      return RuntimeError.unexpected(launchResult.errors[0], { nodeId: appNode.id })
    }
    if (actionError != null) {
      return RuntimeError.fromScriptError(actionError.error, { nodeId: actionError.nodeId })
    }
    if (firstStyleError != null) {
      const createFailure = firstStyleError.error.assertion === true
        ? RuntimeError.assertion
        : RuntimeError.unexpected
      return createFailure(StyleDeclarationResolver.formatError(firstStyleError.error), {
        nodeId: firstStyleError.nodeId,
      })
    }
    if (entryProps.errors.length > 0) {
      return RuntimeError.unexpected(entryProps.errors[0])
    }
    return null
  })
  const displayedRuntimeFailure = $derived(runtimeFailure ?? derivedRuntimeFailure)
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

  $effect(() => () => RuntimeRefRegistry.dispose(runtimeSystem))

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
    left: StyleDeclarationResolver.DeclarationSource,
    right: StyleDeclarationResolver.DeclarationSource,
  ): boolean => (
    left.styleId === right.styleId
    && left.valueType === right.valueType
    && arraysEqual(left.path, right.path, (leftItem, rightItem) => leftItem === rightItem)
  )

  const styleDeclarationsEqual = (
    left: StyleDeclarationResolver.Declaration,
    right: StyleDeclarationResolver.Declaration,
  ): boolean => (
    left.property === right.property
    && left.value === right.value
    && left.state === right.state
    && styleSourcesEqual(left.source, right.source)
  )

  const styleErrorsEqual = (
    left: StyleDeclarationResolver.Error,
    right: StyleDeclarationResolver.Error,
  ): boolean => (
    left.type === right.type
    && left.message === right.message
    && left.styleId === right.styleId
    && left.referenceId === right.referenceId
    && left.parameterId === right.parameterId
    && left.property === right.property
    && left.assertion === right.assertion
    && scriptErrorsEqual(left.scriptError, right.scriptError)
    && arraysEqual(left.path, right.path, (leftItem, rightItem) => leftItem === rightItem)
  )

  const styleResultsEqual = (
    left: StyleDeclarationResolver.Result,
    right: StyleDeclarationResolver.Result,
  ): boolean => (
    arraysEqual(left.declarations, right.declarations, styleDeclarationsEqual)
    && arraysEqual(left.errors, right.errors, styleErrorsEqual)
  )

  const isEmptyStyleResult = (
    result: StyleDeclarationResolver.Result,
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
    if (error != null && runtimeFailure == null) {
      runtimeFailure = RuntimeError.fromScriptError(error, { nodeId })
    }
  }

  const setStyleResult = (
    nodeId: number,
    result: StyleDeclarationResolver.Result | null,
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
    if (result.errors.length > 0 && runtimeFailure == null) {
      const createFailure = result.errors[0].assertion === true
        ? RuntimeError.assertion
        : RuntimeError.unexpected
      runtimeFailure = createFailure(StyleDeclarationResolver.formatError(result.errors[0]), {
        nodeId,
      })
    }
  }
</script>

<div class="runtime-view">
  <style bind:this={runtimeStyleElement}></style>
  {#if displayedRuntimeFailure != null}
    <RuntimeErrorScreen failure={displayedRuntimeFailure} />
  {:else if entryComponentNode != null}
    <RenderContent hostNode={entryComponentNode} contentNodes={rootViewNodes}
      {projectNode} {styleCatalog}
      {formulaContext} {renderRevision} {invalidateRuntime}
      {setActionError} {setStyleResult}
      componentStack={[entryComponentNode.id]} />
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

</style>
