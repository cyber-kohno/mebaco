<script lang="ts">
  import type TreeNode from '../../../../tree/tree-node'
  import type StyleElement from './style-element'
  import StyleTreeLabelPresentation from './style-tree-label-presentation'

  type Props = {
    element: StyleElement.Element
    rootNode?: TreeNode.Node
  }

  let { element, rootNode }: Props = $props()

  const propertyCount = $derived(StyleTreeLabelPresentation.countProperties(element))
  const inheritedStyleNames = $derived(
    StyleTreeLabelPresentation.getInheritedStyleNames(rootNode, element),
  )
</script>

<span class="style-label">
  <span class="style-kind">Style</span>
  <span class="style-value">
    <span class="style-name">{element.id}</span>
    <span class="property-summary">properties {'{'} {propertyCount} {'}'}</span>
    {#if inheritedStyleNames.length > 0}
      <span class="style-detail-group">
        <span class="style-detail-label">inherits:</span>
        {#each inheritedStyleNames as styleName, index (`${element.bases[index].referenceId}-${index}`)}
          <span class="style-token">{styleName}</span>
        {/each}
      </span>
    {/if}
  </span>
</span>

<style>
  .style-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.9;
  }

  .style-kind,
  .style-value {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .style-kind {
    padding: 0 10px;
    border-radius: 4px 0 0 4px;
    background: #e1b5cc;
    color: #27484f;
  }

  .style-value {
    min-width: 82px;
    gap: 12px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
    color: #f4fbfc;
  }

  .style-name {
    color: #ffe184;
  }

  .style-detail-group {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .style-detail-label {
    color: #ddeef1;
  }

  .property-summary {
    color: #f4fbfc;
  }

  .style-token {
    padding: 3px 7px;
    border: 1px solid #9fb56c;
    border-radius: 4px;
    background: #667441;
    color: #efffc2;
    line-height: 1;
  }
</style>
