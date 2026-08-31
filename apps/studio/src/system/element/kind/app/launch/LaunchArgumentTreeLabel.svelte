<script lang="ts">
  import type LaunchArgumentElement from './launch-argument-element'
  import TypeCatalog from '../../type/type-catalog'
  import TypeExpression from '../../type/type-expression'
  import TreeStore from '../../../../store/tree-store'

  let { element }: { element: LaunchArgumentElement.Element } = $props()
  const rootNodeStore = TreeStore.rootNode
  const typeText = $derived(TypeExpression.getTypeText(
    element.valueType,
    (typeId) => TypeCatalog.resolveTypeName($rootNodeStore, typeId),
  ))
</script>

<span class="state-label">
  <span class="state-kind">Argument</span>
  <span class="state-value">
    <span class="state-prefix">$launch.</span><span class="state-name">{element.id}</span><span class="state-separator">:&nbsp;</span><span class="state-type">{typeText}</span>
  </span>
</span>

<style>
  .state-label { display: inline-flex; align-items: center; height: 100%; margin-left: 3px; color: #2b4850; font-size: 15px; font-weight: 700; opacity: 0.86; }
  .state-kind, .state-value { display: inline-flex; align-items: center; height: 30px; border: 1px solid #87bac2; line-height: 1; }
  .state-kind { padding: 0 10px; border-radius: 4px 0 0 4px; background: #eadfcf; color: #27484f; }
  .state-value { min-width: 130px; padding: 0 12px; border-left: 0; border-radius: 0 4px 4px 0; background: #496970; }
  .state-prefix, .state-separator { color: rgba(255, 255, 255, 0.8); }
  .state-name { color: #cce879; }
  .state-type { color: #ffe184; }
</style>
