<script lang="ts">
  import TagCatalog from './tag-catalog'
  import type TagElement from './tag-element'
  import TreeStore from '../../../store/tree-store'
  import DefinitionCatalog from '../../definition-catalog'

  type Props = {
    element: TagElement.Element
  }

  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode

  const tone = $derived(TagCatalog.getTone(element.tagName))
  const styleNames = $derived([...new Set(element.styles.map((style) => (
    DefinitionCatalog.resolveName($rootNodeStore, style.styleId, new Set(['style'])) ?? '-'
  )))])
  const attributeNames = $derived([...new Set(element.attributes.map((attribute) => attribute.name))])
  const refKeyText = $derived(element.refKey == null
    ? null
    : element.refKey.type === 'literal'
      ? element.refKey.value
      : `ƒ ${element.refKey.source}`)
  const hasDetails = $derived(
    element.comment.length > 0
    || styleNames.length > 0
    || attributeNames.length > 0
    || refKeyText != null,
  )
</script>

<span class="tag-label">
  <span class:has-detail={hasDetails} class="tag-kind" data-tone={tone}>
    Tag <span class="tag-name">&lt;{element.tagName}&gt;</span>
  </span>
  {#if hasDetails}
    <span class="tag-details">
      {#if element.comment.length > 0}
        <span class="tag-comment">&lt;!-- {element.comment} --&gt;</span>
      {/if}
      {#if styleNames.length > 0}
        <span class="tag-token-list">
          <span class="tag-detail-label">Styles:</span>
          {#each styleNames as styleName}
            <span class="tag-token style-token">{styleName}</span>
          {/each}
        </span>
      {/if}
      {#if attributeNames.length > 0}
        <span class="tag-token-list">
          <span class="tag-detail-label">Attrs:</span>
          {#each attributeNames as attributeName}
            <span class="tag-token attribute-token">{attributeName}</span>
          {/each}
        </span>
      {/if}
      {#if refKeyText != null}
        <span class="tag-ref">ref: {refKeyText}</span>
      {/if}
    </span>
  {/if}
</span>

<style>
  .tag-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.9;
  }

  .tag-kind,
  .tag-details {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .tag-kind {
    padding: 0 10px;
    border-radius: 4px;
    color: #27484f;
    gap: 8px;
  }

  .tag-kind[data-tone='container'] {
    background: #ece8c8;
  }

  .tag-kind[data-tone='item'] {
    background: #dcedcf;
  }

  .tag-name {
    color: #496970;
    font-style: italic;
  }

  .tag-details {
    gap: 12px;
    min-width: 84px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
  }

  .tag-comment,
  .tag-ref {
    font-style: italic;
  }

  .tag-comment {
    color: #ddeef1;
  }

  .tag-token-list {
    display: inline-flex;
    align-items: center;
    gap: 5px;
  }

  .tag-detail-label {
    color: #ddeef1;
  }

  .tag-token {
    padding: 3px 7px;
    border: 1px solid transparent;
    border-radius: 4px;
    line-height: 1;
  }

  .style-token {
    border-color: #9fb56c;
    background: #667441;
    color: #efffc2;
  }

  .attribute-token {
    border-color: #6eb7c4;
    background: #326b76;
    color: #d8f7fc;
  }

  .tag-ref {
    max-width: 260px;
    overflow: hidden;
    color: #9ed7e1;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .tag-kind.has-detail {
    border-radius: 4px 0 0 4px;
  }

  .tag-kind:last-child {
    border-radius: 4px;
  }
</style>
