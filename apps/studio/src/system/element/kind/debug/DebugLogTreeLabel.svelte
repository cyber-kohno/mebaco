<script lang="ts">
  import type DebugLogElement from './debug-log-element'

  let { element }: { element: DebugLogElement.Element } = $props()

  const visibleParts = $derived([
    ...(element.showLevel ? ['level'] : []),
    ...(element.showDate ? ['date'] : []),
    ...(element.showTime ? ['time'] : []),
    ...(element.showNodeId ? ['node ID'] : []),
  ])
</script>

<span class="log-label">
  <span class="log-kind">Log</span>
  <span class="log-details">
    <span class="log-level">{element.level}</span>
    {#each visibleParts as part}
      <span class="display-token">{part}</span>
    {/each}
  </span>
</span>

<style>
  .log-label { display:inline-flex; align-items:center; height:100%; margin-left:3px; color:#2b4850; font-size:15px; font-weight:700; opacity:.9; }
  .log-kind, .log-details { display:inline-flex; align-items:center; height:30px; border:1px solid #87bac2; line-height:1; }
  .log-kind { padding:0 10px; border-radius:4px 0 0 4px; background:#d2ecf1; color:#27484f; }
  .log-details { min-width:84px; gap:5px; padding:0 12px; border-left:0; border-radius:0 4px 4px 0; background:#496970; }
  .log-level { margin-right:7px; color:#9fe5ef; }
  .display-token { padding:3px 7px; border:1px solid #6eb7c4; border-radius:4px; background:#326b76; color:#d8f7fc; line-height:1; }
</style>
