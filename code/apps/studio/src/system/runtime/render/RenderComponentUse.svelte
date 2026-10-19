<script lang="ts">
  import ComponentUseElement from '@system/model/component/component-use'
  import FormulaContext from '../formula/formula-context'
  import RuntimeProps from '../runtime-props'
  import RuntimeTree from '../runtime-tree'
  import RuntimeState from '../runtime-state'
  import ScriptError from '../script/script-error'
  import type StyleDeclarationResolver from '../style/style-declaration-resolver'
  import type TreeNode from '@system/model/tree/tree-node'
  import RenderComponentContent from './RenderComponentContent.svelte'
  import type FormulaContextType from '../formula/formula-context'
  import type ScriptErrorType from '../script/script-error'
import type SlotContentElement from '@system/model/component/slot-content'
import type SlotElement from '@system/model/component/slot'
  import RuntimeRefRegistry from '../ref/runtime-ref-registry'
  import RuntimeStateDependency from '../runtime-state-dependency'
  import RuntimePartialRegistry from '../partial/runtime-partial-registry'
  import StateView from '../state/state-view'
  import ExecutionPolicy from '../execution-policy'

  type Props = {
    node: TreeNode.Node
    projectNode: TreeNode.Node
    styleCatalog: StyleDeclarationResolver.Catalog
    formulaContext: FormulaContextType.Value
    renderRevision: number
    invalidateRuntime: () => void
    trackStateDependencies: RuntimeStateDependency.Tracker
    invalidateStateDependencies: RuntimeState.WriteHandler
    setActionError: (nodeId: number, error: ScriptErrorType.Value | null) => void
    setStyleResult: (instanceKey: string, nodeId: number, result: StyleDeclarationResolver.Result | null) => void
    componentStack?: readonly number[]
  }

  let {
    node,
    projectNode,
    styleCatalog,
    formulaContext,
    renderRevision,
    invalidateRuntime,
    trackStateDependencies,
    invalidateStateDependencies,
    setActionError,
    setStyleResult,
    componentStack = [],
  }: Props = $props()

  let stateFrame: {
    componentNode: TreeNode.Node
    parentState: FormulaContextType.Value['$state']
    launchValues: FormulaContextType.Value['$launch']
    state: FormulaContextType.Value['$state']
  } | null = null
  const componentSystem = RuntimeRefRegistry.createSystem({
    requestRender: () => invalidateRuntime(),
    reportError: (nodeId, error) => setActionError(nodeId, error),
  })
  const componentInvalidate = RuntimePartialRegistry.create()

  $effect(() => () => RuntimeRefRegistry.dispose(componentSystem))
  $effect(() => () => RuntimePartialRegistry.dispose(componentInvalidate))

  const componentUse = $derived(RuntimeTree.isComponentUseNode(node) ? node.element : null)
  const componentNode = $derived(
    componentUse?.componentId == null
      ? null
      : ComponentUseElement.findComponentNode(projectNode, node.id, componentUse.componentId),
  )
  const recursiveError = $derived(
    componentNode != null && componentStack.includes(componentNode.id)
      ? ScriptError.create('runtime', `Component '${componentNode.element.kind === 'component' ? componentNode.element.id : ''}' calls itself recursively.`)
      : null,
  )
  const propsResult = $derived.by(() => {
    renderRevision
    return trackStateDependencies(() => {
    if (componentUse == null || componentNode == null || recursiveError != null) {
      return RuntimeProps.empty()
    }
    return RuntimeProps.resolveBindings(
      componentNode,
      componentUse.propBindings ?? [],
      formulaContext,
      projectNode,
    )
    })
  })
  const nextContext = $derived(FormulaContext.create({
    ...formulaContext,
    $props: propsResult.values,
  }))
  const slotContents = $derived.by(() => {
    const folder = node.children.find((child) => child.element.kind === 'slot-contents')
    return new Map(
      folder?.children
        .filter((child): child is TreeNode.Node & { element: SlotContentElement.Element } => child.element.kind === 'slot-content')
        .map((child) => [child.element.slotId, child]) ?? [],
    )
  })
  const slotDefinitions = $derived.by(() => {
    const folder = componentNode?.children.find((child) => child.element.kind === 'slots')
    return new Map(
      folder?.children
        .filter((child): child is TreeNode.Node & { element: SlotElement.Element } => child.element.kind === 'slot')
        .map((child) => [child.element.slotId, child]) ?? [],
    )
  })
  const componentState = $derived.by(() => {
    if (componentNode == null) return formulaContext.$state
    if (
      stateFrame?.componentNode === componentNode
      && stateFrame.parentState === formulaContext.$state
      && stateFrame.launchValues === formulaContext.$launch
    ) return stateFrame.state

    const created = RuntimeState.createComponentState(
      projectNode,
      StateView.create(
        formulaContext.$state,
        ExecutionPolicy.create('mutable', 'runtime', node.id),
      ),
      RuntimeTree.getComponentStateNodes(componentNode),
      formulaContext.$launch,
      formulaContext.$const,
      { onWrite: invalidateStateDependencies },
    )
    stateFrame = {
      componentNode,
      parentState: formulaContext.$state,
      launchValues: formulaContext.$launch,
      state: created,
    }
    return created
  })
  const componentContext = $derived(FormulaContext.create({
    ...nextContext,
    $state: componentState,
    $system: componentSystem,
    $invalidate: componentInvalidate,
  }))
  const error = $derived.by(() => {
    if (componentUse?.componentId == null) {
      return ScriptError.create('runtime', 'Component is not selected.')
    }
    if (componentNode == null) {
      return ScriptError.create('runtime', 'Component was not found.')
    }
    if (recursiveError != null) return recursiveError
    if (propsResult.errors.length > 0) {
      return ScriptError.create('runtime', propsResult.errors[0])
    }
    return null
  })

  $effect(() => {
    setActionError(node.id, error)
    return () => setActionError(node.id, null)
  })
</script>

{#if error == null && componentNode != null}
  <RenderComponentContent
    {componentNode}
    {projectNode}
    {styleCatalog}
    formulaContext={componentContext}
    {renderRevision}
    {invalidateRuntime}
    {trackStateDependencies}
    {invalidateStateDependencies}
    {setActionError}
    {setStyleResult}
    {slotContents}
    {slotDefinitions}
    slotCallerContext={formulaContext}
    componentStack={[...componentStack, componentNode.id]}
  />
{/if}
