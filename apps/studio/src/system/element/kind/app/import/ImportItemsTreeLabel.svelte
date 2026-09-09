<script lang="ts">
  import DefinitionCatalog from '../../../definition-catalog'
  import type TreeNode from '../../../../tree/tree-node'
  import type ResourceImportsElement from './resource-imports-element'
  import type StorageImportsElement from './storage-imports-element'
  import type TransitionsElement from './transitions-element'

  type Element = TransitionsElement.Element | ResourceImportsElement.Element | StorageImportsElement.Element

  type Props = {
    element: Element
    rootNode?: TreeNode.Node
  }

  let { element, rootNode }: Props = $props()

  const kindText = $derived(element.kind === 'transitions'
    ? 'Transitions'
    : element.kind === 'resource-imports' ? 'Resources' : 'Storage')
  const detailLabel = $derived(element.kind === 'transitions' ? 'apps:' : 'items:')
  const itemIds = $derived(
    element.kind === 'transitions'
      ? element.appIds
      : element.kind === 'resource-imports' ? element.resourceIds : element.storageIds,
  )
  const definitionKinds = $derived(
    element.kind === 'transitions'
      ? new Set(['app'])
      : element.kind === 'resource-imports'
        ? new Set(['directory-resource', 'text-resource', 'sqlite-resource'])
        : new Set(['key-value']),
  )
  const itemNames = $derived(itemIds.map((itemId) => (
    rootNode == null
      ? '-'
      : DefinitionCatalog.resolveName(rootNode, itemId, definitionKinds) ?? '-'
  )))
</script>

<span class="import-label">
  <span class:has-detail={itemNames.length > 0} class="import-kind">{kindText}</span>
  {#if itemNames.length > 0}
    <span class="import-details">
      <span class="import-detail-label">{detailLabel}</span>
      {#each itemNames as itemName, index (`${itemIds[index]}-${index}`)}
        <span class="import-token" data-tone={element.kind}>{itemName}</span>
      {/each}
    </span>
  {/if}
</span>

<style>
  .import-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.9;
  }

  .import-kind,
  .import-details {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .import-kind {
    padding: 0 10px;
    border-radius: 4px;
    background: #d2ecf1;
    color: #27484f;
  }

  .import-kind.has-detail {
    border-radius: 4px 0 0 4px;
  }

  .import-details {
    gap: 5px;
    min-width: 84px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
  }

  .import-detail-label {
    margin-right: 7px;
    color: #ddeef1;
  }

  .import-token {
    padding: 3px 7px;
    border: 1px solid transparent;
    border-radius: 4px;
    line-height: 1;
  }

  .import-token[data-tone='transitions'] {
    border-color: #6eb7c4;
    background: #326b76;
    color: #d8f7fc;
  }

  .import-token[data-tone='resource-imports'] {
    border-color: #9fb56c;
    background: #667441;
    color: #efffc2;
  }

  .import-token[data-tone='storage-imports'] {
    border-color: #b6a36b;
    background: #75683f;
    color: #fff3c5;
  }
</style>
