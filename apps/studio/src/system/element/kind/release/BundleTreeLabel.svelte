<script lang="ts">
  import DefinitionCatalog from '../../definition-catalog'
  import type TreeNode from '../../../tree/tree-node'
  import type BundleElement from './bundle-element'

  type Props = {
    element: BundleElement.Element
    rootNode?: TreeNode.Node
  }

  let { element, rootNode }: Props = $props()

  const launcherNames = $derived(element.launcherIds.map((launcherId) => (
    rootNode == null
      ? '-'
      : DefinitionCatalog.resolveName(rootNode, launcherId, new Set(['launcher'])) ?? '-'
  )))
</script>

<span class="bundle-label">
  <span class="bundle-kind">Bundle</span>
  <span class="bundle-value">
    <span class="bundle-name">{element.id}</span>
    {#if launcherNames.length > 0}
      <span class="bundle-detail-label">launchers:</span>
      {#each launcherNames as launcherName, index (`${element.launcherIds[index]}-${index}`)}
        <span class="bundle-token">{launcherName}</span>
      {/each}
    {/if}
  </span>
</span>

<style>
  .bundle-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.9;
  }

  .bundle-kind,
  .bundle-value {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .bundle-kind {
    padding: 0 10px;
    border-radius: 4px 0 0 4px;
    background: #e1b5cc;
    color: #27484f;
  }

  .bundle-value {
    min-width: 82px;
    gap: 5px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
    color: #f4fbfc;
  }

  .bundle-name {
    color: #ffe184;
  }

  .bundle-detail-label {
    margin-right: 7px;
    color: #ddeef1;
  }

  .bundle-token {
    padding: 3px 7px;
    border: 1px solid #9fb56c;
    border-radius: 4px;
    background: #667441;
    color: #efffc2;
    line-height: 1;
  }
</style>
