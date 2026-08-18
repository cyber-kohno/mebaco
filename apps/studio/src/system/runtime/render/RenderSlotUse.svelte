<script lang="ts">
  import type FormulaContext from '../formula/formula-context'
  import type StyleResolver from '../style/style-resolver'
  import type ScriptError from '../script/script-error'
  import type TreeNode from '../../tree/tree-node'
  import RuntimeProps from '../runtime-props'
  import ScriptErrorFactory from '../script/script-error'
  import FormulaContextFactory from '../formula/formula-context'
  import RenderContent from './RenderContent.svelte'
  import type SlotUseElement from '../../element/kind/component/definition/slot/slot-use-element'
  import type ValuePropElement from '../../element/kind/component/definition/value-prop-element'

  type Props = {
    node: TreeNode.Node & { element: SlotUseElement.Element }
    projectNode: TreeNode.Node
    styleCatalog: StyleResolver.Catalog
    formulaContext: FormulaContext.Value
    renderRevision: number
    invalidateRuntime: () => void
    setActionError: (nodeId: number, error: ScriptError.Value | null) => void
    setStyleResult: (nodeId: number, result: StyleResolver.Result | null) => void
    componentStack?: readonly number[]
    slotContents?: ReadonlyMap<string, TreeNode.Node>
    slotDefinitions?: ReadonlyMap<string, TreeNode.Node>
    slotCallerContext?: FormulaContext.Value
  }

  let {
    node, projectNode, styleCatalog, formulaContext, renderRevision,
    invalidateRuntime, setActionError, setStyleResult, componentStack = [],
    slotContents, slotDefinitions, slotCallerContext = formulaContext,
  }: Props = $props()

  const definition = $derived(slotDefinitions?.get(node.element.slotId) ?? null)
  const content = $derived(slotContents?.get(node.element.slotId) ?? null)
  const slotProps = $derived<ValuePropElement.Element[]>(
    definition?.children.find((child) => child.element.kind === 'props')?.children
      ?.map((child) => child.element)
      .filter((element): element is ValuePropElement.Element => element.kind === 'value-prop') ?? [],
  )
  const propsResult = $derived(RuntimeProps.resolveBindingsForProps(
    slotProps,
    node.element.propBindings ?? [],
    formulaContext,
    projectNode,
  ))
  const contentContext = $derived(FormulaContextFactory.create({
    ...slotCallerContext,
    $props: propsResult.values,
  }))
  const error = $derived(propsResult.errors.length > 0
    ? ScriptErrorFactory.create('runtime', propsResult.errors[0])
    : null)

  $effect(() => {
    setActionError(node.id, error)
    return () => setActionError(node.id, null)
  })
</script>

{#if error == null && content != null}
  <RenderContent
    hostNode={content}
    {projectNode} {styleCatalog}
    formulaContext={contentContext}
    {renderRevision} {invalidateRuntime} {setActionError} {setStyleResult}
    {componentStack}
  />
{/if}
