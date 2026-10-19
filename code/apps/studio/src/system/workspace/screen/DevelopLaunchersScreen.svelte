<script lang="ts">
  import Rocket from '@lucide/svelte/icons/rocket'
  import Search from '@lucide/svelte/icons/search'
  import TreeStore from '../tree/state'
  import DevelopLauncherController from '../develop-launcher-controller'
  import { translatorStore } from '@system/application/localization'

  const rootNodeStore = TreeStore.rootNode
  let selectedNodeId = $state<number | null>(null)
  let query = $state('')
  const items = $derived(DevelopLauncherController.collect($rootNodeStore))
  const filteredItems = $derived(items.filter((item) => (
    `${item.launcher.name ?? ''} ${item.launcher.id} ${item.app?.id ?? ''}`
      .toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())
  )))
  const selected = $derived(filteredItems.find((item) => item.nodeId === selectedNodeId) ?? null)

  $effect(() => {
    if (selectedNodeId != null && !items.some((item) => item.nodeId === selectedNodeId)) {
      selectedNodeId = null
    }
  })

  const launch = () => {
    if (selected != null) DevelopLauncherController.open($rootNodeStore, selected.nodeId)
  }
</script>

<section class="launchers-screen" aria-label={$translatorStore('workspace.launchers.label')}>
  <header class="screen-header">
    <div>
      <h1>{$translatorStore('workspace.action.launchers')} <span class="count">{items.length}</span></h1>
      <p>{$translatorStore('workspace.launchers.description')}</p>
    </div>
    <button class="launch-button" type="button" disabled={selected == null || selected.problem != null} onclick={launch}>
      <Rocket size={16} />
      {$translatorStore('workspace.launchers.launch')}
    </button>
  </header>

  <div class="filter-bar">
    <label class="search-field">
      <Search size={16} />
      <input type="search" bind:value={query}
        aria-label={$translatorStore('workspace.launchers.search')}
        placeholder={$translatorStore('workspace.launchers.search')} />
    </label>
    <span>{$translatorStore('workspace.launchers.visibleCount', { visible: filteredItems.length, total: items.length })}</span>
  </div>

  <div class="list-panel">
    {#if items.length === 0}
      <div class="empty-state">
        <Rocket size={34} strokeWidth={1.5} />
        <strong>{$translatorStore('workspace.launchers.empty')}</strong>
        <p>{$translatorStore('workspace.launchers.emptyDescription')}</p>
      </div>
    {:else if filteredItems.length === 0}
      <div class="empty-state"><p>{$translatorStore('workspace.launchers.noResults')}</p></div>
    {:else}
      <table>
        <thead>
          <tr>
            <th scope="col">{$translatorStore('workspace.launchers.name')}</th>
            <th scope="col">ID</th>
            <th scope="col">App</th>
            <th scope="col">{$translatorStore('workspace.launchers.configuration')}</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredItems as item (item.nodeId)}
            <tr class="mbc-record-hover" class:selected={selectedNodeId === item.nodeId}>
              <td>
                <button class="select-launcher" type="button"
                  aria-pressed={selectedNodeId === item.nodeId}
                  onclick={() => selectedNodeId = selectedNodeId === item.nodeId ? null : item.nodeId}>
                  <Rocket size={17} />
                  <strong>{item.launcher.name?.trim() || item.launcher.id}</strong>
                </button>
              </td>
              <td><code>{item.launcher.id}</code></td>
              <td>{item.app?.id ?? '—'}</td>
              <td class:unavailable={item.problem != null}>
                {$translatorStore(item.problem == null
                  ? 'workspace.launchers.configured'
                  : `workspace.launchers.problem.${item.problem}`)}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</section>

<style>
  .launchers-screen {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--mbc-color-surface);
    color: var(--mbc-color-text);
    font-size: 13px;
  }

  .screen-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    padding: 20px 24px;
    border-bottom: 1px solid var(--mbc-color-border);
  }

  h1, p { margin: 0; }
  h1 { display: flex; align-items: center; gap: 10px; font-size: 21px; }
  .screen-header p { margin-top: 5px; color: var(--mbc-color-text-muted); }
  .count { padding: 2px 8px; border-radius: 12px; background: var(--mbc-color-primary-soft); color: #236f7a; font-size: 12px; }

  .launch-button {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    flex: none;
    height: 34px;
    padding: 0 16px;
    border: 1px solid var(--mbc-color-primary);
    border-radius: 7px;
    background: var(--mbc-color-primary);
    color: white;
    font: inherit;
    font-weight: 700;
  }
  .launch-button:disabled { opacity: 0.45; }
  .launch-button:not(:disabled):hover { background: var(--mbc-color-primary-hover); }
  button:focus-visible, input:focus-visible { outline: 3px solid var(--mbc-color-focus-ring); outline-offset: 2px; }

  .filter-bar { display: flex; align-items: center; gap: 16px; padding: 14px 24px; color: var(--mbc-color-text-muted); }
  .search-field { display: flex; align-items: center; gap: 8px; width: min(420px, 70%); padding: 7px 10px; border: 1px solid var(--mbc-color-border-strong); border-radius: 7px; }
  input { min-width: 0; width: 100%; border: 0; background: transparent; color: var(--mbc-color-text); font: inherit; }
  .list-panel { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 0 24px 24px; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; text-align: left; }
  th { position: sticky; z-index: 1; top: 0; padding: 10px 12px; border-bottom: 1px solid var(--mbc-color-border-strong); background: var(--mbc-color-surface-soft); font-size: 12px; }
  td { padding: 10px 12px; border-bottom: 1px solid var(--mbc-color-border); overflow-wrap: anywhere; }
  td:first-child { padding: 0; width: 36%; }
  tbody tr { position: relative; }
  tr.selected { background-color: var(--mbc-color-primary-soft); }
  .select-launcher { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 12px; border: 0; background: transparent; color: inherit; font: inherit; text-align: left; }
  /* Extend the native button's hit area and focus indicator across the record. */
  .select-launcher::after { content: ''; position: absolute; inset: 0; }
  .select-launcher:focus-visible { outline: none; }
  .select-launcher:focus-visible::after { outline: 3px solid var(--mbc-color-focus-ring); outline-offset: -3px; }
  .select-launcher :global(svg) { flex: none; color: #2b8794; }
  .unavailable { color: #a06a26; }
  .empty-state { display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 70px 20px; color: var(--mbc-color-text-muted); text-align: center; }
</style>
