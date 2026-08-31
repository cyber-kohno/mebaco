<script lang="ts">
  import TreeStore from '../../../store/tree-store'
  import TypeCatalog from '../type/type-catalog'
  import ValueTypeDefinition from '../type/value-type-definition'
  import type FunctionElement from './function-element'
  import FunctionDefinition from './function-definition'

  type Props = { element: FunctionElement.Element }
  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode

  const getReturnTypeText = () => FunctionDefinition.getReturnType($rootNodeStore, element) == null
    ? 'void'
    : ValueTypeDefinition.getTypeText(
        FunctionDefinition.getReturnType($rootNodeStore, element)!,
        (id) => TypeCatalog.resolveTypeName($rootNodeStore, id),
      )

  const getSignatureName = () => element.signature.mode === 'refer'
    ? TypeCatalog.resolveTypeName($rootNodeStore, element.signature.signatureTypeId) ?? '-'
    : '-'
</script>

<span class="node-label">
  <span class="node-kind">Function</span>
  <span class="node-value">
    {#if element.signature.mode === 'refer'}
      <span class="prefix">$fn.</span><span class="name">{element.id}</span><span class="separator">:&nbsp;</span><span class="reference">{getSignatureName()}</span>
    {:else}
      {#if FunctionDefinition.getAsync($rootNodeStore, element)}<span class="async">async&nbsp;</span>{/if}
      <span class="prefix">$fn.</span><span class="name">{element.id}</span>
      <span class="arrow">&nbsp;=&gt;&nbsp;</span><span class="type">{getReturnTypeText()}</span>
    {/if}
  </span>
</span>

<style>
  .node-label { display:inline-flex; align-items:center; height:100%; margin-left:3px; color:#2b4850; font-size:15px; font-weight:700; opacity:.86; }
  .node-kind, .node-value { display:inline-flex; align-items:center; height:30px; border:1px solid #87bac2; line-height:1; }
  .node-kind { padding:0 10px; border-radius:4px 0 0 4px; background:#e1b5cc; color:#27484f; }
  .node-value { min-width:82px; padding:0 12px; border-left:0; border-radius:0 4px 4px 0; background:#496970; color:#f4fbfc; }
  .async { color: #ff8f8f; }
  .prefix, .arrow, .separator { color: #f4fbfc; }
  .name { color: #cce879; }
  .type { color: #9fe5ef; }
  .reference { color: #ffb36b; }
</style>
