<script lang="ts">
  import type Constant from '@system/model/declaration/constant'
  import TreeStore from '@system/workspace/tree/state'
  import TypeCatalog from '@system/model/type-system/type-catalog'
  import TypeExpression from '@system/model/type-system/type-expression'

  type Props = { element: Constant.Element }
  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode
  const source = $derived(element.source.replace(/\s*\r?\n\s*/g, ' '))
  const preview = $derived(source.length > 28 ? `${source.slice(0, 28)}...` : source)
  const typeText = $derived(element.typeSetting.type === 'explicit'
    ? `${TypeExpression.getTypeText(
        element.typeSetting.valueType,
        (id) => TypeCatalog.resolveTypeName($rootNodeStore, id),
      )}${element.typeSetting.nullable ? ' | null' : ''}`
    : null)
</script>

<span class="label">
  <span class="kind">Const</span>
  <span class="value">
    <span class="prefix">$const.</span><span class="name">{element.id}</span>
    {#if typeText != null}<span class="type">: {typeText}</span>{/if}
    <span class="equals"> = </span><span class="source">{preview}</span>
  </span>
</span>

<style>
  .label { display:inline-flex; align-items:center; height:100%; margin-left:3px; font-size:15px; font-weight:700; }
  .kind,.value { display:inline-flex; align-items:center; height:30px; border:1px solid #87bac2; line-height:1; }
  .kind { padding:0 10px; border-radius:4px 0 0 4px; background:#e4e8ca; color:#27484f; }
  .value { padding:0 12px; border-left:0; border-radius:0 4px 4px 0; background:#496970; }
  .prefix,.equals { color:rgba(255,255,255,.8); }
  .name { color:#cce879; }
  .type { color:#ffe184; }
  .source { color:#fff; font-style:italic; opacity:.9; }
</style>
