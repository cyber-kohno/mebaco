<script lang="ts">
  import type State from '@system/model/variable/state'
  import VariableDefinition from '@system/model/variable/variable-definition'
  import TreeStore from '@system/workspace/tree/state'
  import TypeCatalog from '@system/model/type-system/type-catalog'
  import TypeExpression from '@system/model/type-system/type-expression'
  import ValuePreviewTreeLabel from '@system/workspace/tree/label/ValuePreviewTreeLabel.svelte'

  type Props = {
    element: State.Element
  }

  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode

  const typeText = $derived(VariableDefinition.getTypeText(
    element,
    (typeId) => TypeCatalog.resolveTypeName($rootNodeStore, typeId),
  ))
  const literalType = $derived.by(() => {
    const { base, depth } = TypeExpression.unwrapArray(element.valueType)
    if (depth > 0) return 'raw' as const
    if (base.type === 'string') return 'string' as const
    if (base.type !== 'named') return 'raw' as const
    const union = TypeCatalog.findUnion($rootNodeStore, base.namedTypeId)
    return union?.element.definition.type === 'literal'
      && union.element.definition.valueType === 'string'
      ? 'string' as const
      : 'raw' as const
  })
</script>

<span class="state-label">
  <span class="state-kind">State</span>
  <span class="state-value">
    <span class="state-prefix">$state.</span><span class="state-name">{element.id}</span><span class="state-separator">:&nbsp;</span><span class="state-type">{typeText}</span><span class="state-separator">&nbsp;=&nbsp;</span>
    {#if element.initial.type === 'default'}
      <ValuePreviewTreeLabel kind="default" />
    {:else if element.initial.type === 'literal'}
      <ValuePreviewTreeLabel kind="literal" value={element.initial.value} {literalType} />
    {:else}
      <ValuePreviewTreeLabel kind="formula" value={element.initial.source} />
    {/if}
  </span>
</span>

<style>
  .state-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.86;
  }

  .state-kind,
  .state-value {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .state-kind {
    padding: 0 10px;
    border-radius: 4px 0 0 4px;
    background: #eadfcf;
    color: #27484f;
  }

  .state-value {
    min-width: 130px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
  }

  .state-prefix,
  .state-separator {
    color: rgba(255, 255, 255, 0.8);
  }

  .state-name {
    color: #cce879;
  }

  .state-type {
    color: #ffe184;
  }

</style>
