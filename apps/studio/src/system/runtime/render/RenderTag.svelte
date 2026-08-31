<script lang="ts">
  import type FormulaContext from '../formula/formula-context'
  import type TagElement from '../../element/kind/view/tag/tag-element'
  import ActionEvaluator from '../action/action-evaluator'
  import FormulaContextValue from '../formula/formula-context'
  import FormulaEvaluator from '../formula/formula-evaluator'
  import ScriptError from '../script/script-error'
  import TagCatalog from '../../element/kind/view/tag/tag-catalog'
  import RenderContent from './RenderContent.svelte'
  import RetentionResolver from '../retention/retention-resolver'
  import RuntimeTree from '../runtime-tree'
  import type ScriptErrorValue from '../script/script-error'
  import type TreeNode from '../../tree/tree-node'
  import StyleDeclarationResolver from '../style/style-declaration-resolver'
  import RuntimeRefKey from '../ref/runtime-ref-key'
  import RuntimeRefRegistry from '../ref/runtime-ref-registry'

  type Props = {
    node: TreeNode.Node
    projectNode: TreeNode.Node
    styleCatalog: StyleDeclarationResolver.Catalog
    formulaContext: FormulaContext.Value
    renderRevision: number
    invalidateRuntime: () => void
    setActionError: (nodeId: number, error: ScriptErrorValue.Value | null) => void
    setStyleResult: (nodeId: number, result: StyleDeclarationResolver.Result | null) => void
    componentStack?: readonly number[]
  }

  let {
    node,
    projectNode,
    styleCatalog,
    formulaContext,
    renderRevision,
    invalidateRuntime,
    setActionError,
    setStyleResult,
    componentStack = [],
  }: Props = $props()

  const tag = $derived(RuntimeTree.isTagNode(node) ? node.element : null)
  let tagDomElement = $state<HTMLElement | null>(null)
  let refRegistrationError = $state<ScriptErrorValue.Value | null>(null)

  const retentionResult = $derived.by(() => {
    renderRevision
    return RetentionResolver.resolve(node, formulaContext, projectNode)
  })

  const refKeyResult = $derived.by(() => {
    renderRevision
    return RuntimeRefKey.resolve(tag?.refKey, retentionResult.context)
  })

  const runtimeError = $derived(
    retentionResult.error ?? refKeyResult.error ?? refRegistrationError,
  )

  $effect(() => {
    setActionError(retentionResult.errorNodeId ?? node.id, runtimeError)
    return () => setActionError(node.id, null)
  })

  $effect(() => {
    refRegistrationError = null
    if (tagDomElement == null || refKeyResult.key == null) return

    return RuntimeRefRegistry.register(
      retentionResult.context.$system,
      refKeyResult.key,
      tagDomElement,
      (message) => {
        refRegistrationError = message == null
          ? null
          : ScriptError.create('runtime', message)
      },
    )
  })

  const styleResult = $derived.by(() => {
    renderRevision
    return tag == null
      ? { declarations: [], errors: [] }
      : styleCatalog.resolve(tag.styles, retentionResult.context)
  })

  $effect(() => {
    setStyleResult(node.id, styleResult)
  })

  $effect(() => {
    const nodeId = node.id
    return () => setStyleResult(nodeId, null)
  })

  const getAttributeValue = (
    value: TagElement.AttributeValue,
  ): unknown => {
    switch (value.type) {
      case 'empty':
        return true
      case 'literal':
        return value.value
      case 'boolean':
        return value.value
      case 'formula': {
        const result = FormulaEvaluator.evaluateExpression(value.source, retentionResult.context)
        if (result.ok) return result.value

        if (import.meta.env.DEV) {
          console.warn(
            '[Mebaco runtime] Failed to evaluate tag attribute.',
            ScriptError.format(result.error),
          )
        }
        return undefined
      }
    }
  }

  const executeEventAction = (
    attribute: TagElement.EventHandler,
    event: Event,
  ) => {
    if (attribute.preventDefault) event.preventDefault()
    if (attribute.stopPropagation) event.stopPropagation()

    const transaction = RuntimeRefRegistry.beginAction(retentionResult.context.$system, node.id)
    const result = ActionEvaluator.executeScript(
      attribute.action.source,
      FormulaContextValue.create({
        ...retentionResult.context,
        $event: event,
      }),
    )
    transaction.complete(result.ok)

    if (!result.ok) {
      console.error(
        '[Mebaco runtime] Tag event failed.',
        ScriptError.format(result.error),
      )
      setActionError(node.id, result.error)
      return
    }

    setActionError(node.id, null)
    invalidateRuntime()
  }

  const elementAttributes = $derived.by(() => {
    renderRevision
    if (tag == null) return {}

    const attrs: Record<string, unknown> = {}
    tag.attributes.forEach((attribute) => {
      if (attribute.name.length === 0) return

      switch (attribute.type) {
        case 'attribute':
        case 'property':
          attrs[attribute.name] = getAttributeValue(attribute.value)
          break
        case 'event':
          attrs[`on${attribute.name}`] = (event: Event) => {
            executeEventAction(attribute, event)
          }
          break
      }
    })

    const internalClass = `mbc-runtime-node-${node.id}`
    attrs.class = typeof attrs.class === 'string' && attrs.class.length > 0
      ? `${attrs.class} ${internalClass}`
      : internalClass
    return attrs
  })
</script>

{#if tag != null && retentionResult.error == null}
  {#if TagCatalog.canHaveChildren(tag.tagName)}
    <svelte:element this={tag.tagName} {...elementAttributes} bind:this={tagDomElement}>
      <RenderContent hostNode={node} {projectNode} {styleCatalog}
        formulaContext={retentionResult.context} evaluateRetention={false}
        {renderRevision} {invalidateRuntime} {setActionError} {setStyleResult} {componentStack} />
    </svelte:element>
  {:else}
    <svelte:element this={tag.tagName} {...elementAttributes} bind:this={tagDomElement} />
  {/if}
{/if}
