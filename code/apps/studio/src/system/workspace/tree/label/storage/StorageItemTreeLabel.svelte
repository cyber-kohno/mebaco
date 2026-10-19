<script lang="ts">
  import TreeStore from '@system/workspace/tree/state'
  import TypeCatalog from '@system/model/type-system/type-catalog'
  import VariableDefinition from '@system/model/variable/variable-definition'
  import type StorageItem from '@system/model/storage/storage-item'

  let { element }: { element: StorageItem.Element } = $props()
  const rootNodeStore = TreeStore.rootNode
  const typeText = $derived(VariableDefinition.getTypeText(
    element,
    (typeId) => TypeCatalog.resolveTypeName($rootNodeStore, typeId),
  ))
</script>

<span class="label"><span class="kind">Key Value</span><span class="value"><span class="prefix">$storage.keyValue.</span><span class="name">{element.id}</span><span class="type">: {typeText}</span></span></span>

<style>
  .label,.kind,.value{display:inline-flex;align-items:center;height:30px;font-size:15px;font-weight:700}.label{margin-left:3px;opacity:.86}.kind,.value{border:1px solid #87bac2}.kind{padding:0 10px;border-radius:4px 0 0 4px;background:#d9e8d1;color:#27484f}.value{min-width:130px;padding:0 12px;border-left:0;border-radius:0 4px 4px 0;background:#496970}.prefix{color:rgba(255,255,255,.8)}.name{color:#cce879}.type{color:#ffe184}
</style>
