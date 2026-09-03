<script lang="ts">
  import ElementSearchQuery from './element-search-query'

  let {
    text,
    searchText,
    exact,
  }: {
    text: string
    searchText: string
    exact: boolean
  } = $props()

  const segments = $derived(ElementSearchQuery.highlight(text, searchText))
</script>

{#each segments as segment}
  {#if segment.highlighted}<mark class:exact>{segment.text}</mark>{:else}{segment.text}{/if}
{/each}

<style>
  mark {
    padding: 0;
    background: var(--search-mark-background, #ffe08a);
    color: var(--search-mark-text, #263a3f);
  }

  mark.exact {
    background: var(--search-exact-mark-background, #d8b4fe);
    color: var(--search-exact-mark-text, #3b175f);
  }
</style>
