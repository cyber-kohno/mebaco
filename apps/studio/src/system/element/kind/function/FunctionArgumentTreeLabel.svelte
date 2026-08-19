<script lang="ts">
  import TreeStore from '../../../store/tree-store'
  import TypeCatalog from '../type/type-catalog'
  import TypeExpression from '../type/type-expression'
  import type FunctionArgumentElement from './function-argument-element'

  type Props = { element: FunctionArgumentElement.Element }
  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode

  const typeText = $derived(`${TypeExpression.getTypeText(
    element.valueType,
    (typeId) => TypeCatalog.resolveTypeName($rootNodeStore, typeId),
  )}${element.nullable ? ' | null' : ''}`)
</script>

<span class="argument-label">
  <span class="argument-kind">Argument</span>
  <span class="argument-value">
    <span class="argument-prefix">$args.</span><span class="argument-name">{element.id}</span><span class="argument-separator">:&nbsp;</span><span class="argument-type">{typeText}</span>
  </span>
</span>

<style>
  .argument-label { display:inline-flex; align-items:center; height:100%; margin-left:3px; color:#2b4850; font-size:15px; font-weight:700; opacity:.86; }
  .argument-kind, .argument-value { display:inline-flex; align-items:center; height:30px; border:1px solid #87bac2; line-height:1; }
  .argument-kind { padding:0 10px; border-radius:4px 0 0 4px; background:#eadfcf; color:#27484f; }
  .argument-value { min-width:130px; padding:0 12px; border-left:0; border-radius:0 4px 4px 0; background:#496970; }
  .argument-prefix, .argument-separator { color:rgba(255,255,255,.8); }
  .argument-name { color:#cce879; }
  .argument-type { color:#ffe184; }
</style>
