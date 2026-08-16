<script lang="ts">
  import TagCatalog from './tag-catalog'
  import type TagElement from './tag-element'

  type Props = {
    element: TagElement.Element
  }

  let { element }: Props = $props()

  const tone = $derived(TagCatalog.getTone(element.tagName))
  const styleIds = $derived(element.styles.map((style) => style.styleId))
</script>

<span class="tag-label">
  <span class:has-detail={element.comment.length > 0 || styleIds.length > 0} class="tag-kind" data-tone={tone}>
    Tag <span class="tag-name">&lt;{element.tagName}&gt;</span>
  </span>
  {#if element.comment.length > 0}
    <span class="tag-comment">&lt;!-- {element.comment} --&gt;</span>
  {/if}
  {#if styleIds.length > 0}
    <span class="tag-styles">Styles[{styleIds.join(', ')}]</span>
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
  .tag-comment {
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

  .tag-comment,
  .tag-styles {
    min-width: 84px;
    padding: 0 12px;
    border-left: 0;
    background: #14171a;
    color: #ddeef1;
    font-style: italic;
  }

  .tag-comment:last-child,
  .tag-styles:last-child {
    border-radius: 0 4px 4px 0;
  }

  .tag-styles {
    min-width: 0;
    color: #d1dfa0;
  }

  .tag-kind.has-detail {
    border-radius: 4px 0 0 4px;
  }

  .tag-kind:last-child {
    border-radius: 4px;
  }
</style>
