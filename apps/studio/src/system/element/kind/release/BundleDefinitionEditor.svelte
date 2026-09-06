<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down'
  import ArrowUp from '@lucide/svelte/icons/arrow-up'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import IconButton from '../../../ui/button/IconButton.svelte'
  import type ElementEditSchema from '../../../element-dialog/element-edit-schema'
  import type TreeNode from '../../../tree/tree-node'
  import ReleaseBundle from '../../../release/release-bundle'

  type Props = {
    rootNode: TreeNode.Node
    value: string
    options: readonly ElementEditSchema.SelectOption[]
    errorMessage?: string | null
    onValueChange: (value: string) => void
  }

  let { rootNode, value, options, errorMessage = null, onValueChange }: Props = $props()
  let launcherIds = $state<string[]>([])
  let lastValue = $state('')
  const analysis = $derived(ReleaseBundle.analyze(rootNode, launcherIds))

  const parse = (source: string): string[] => {
    try {
      const parsed: unknown = JSON.parse(source)
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : []
    } catch {
      return []
    }
  }

  const emit = () => {
    lastValue = JSON.stringify(launcherIds)
    onValueChange(lastValue)
  }

  $effect(() => {
    if (value === lastValue) return
    launcherIds = parse(value)
    lastValue = value
  })

  const add = () => {
    const available = options.find((option) => !launcherIds.includes(option.value))
    if (available == null) return
    launcherIds = [...launcherIds, available.value]
    emit()
  }

  const update = (index: number, launcherId: string) => {
    launcherIds = launcherIds.map((current, currentIndex) => (
      currentIndex === index ? launcherId : current
    ))
    emit()
  }

  const remove = (index: number) => {
    launcherIds = launcherIds.filter((_, currentIndex) => currentIndex !== index)
    emit()
  }

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset
    if (target < 0 || target >= launcherIds.length) return
    const next = [...launcherIds]
    ;[next[index], next[target]] = [next[target], next[index]]
    launcherIds = next
    emit()
  }
</script>

<div class="bundle-editor">
  {#if errorMessage != null}<div class="editor-error">{errorMessage}</div>{/if}
  <div class="split-pane">
    <section class="launcher-pane" aria-label="Bundle Launchers">
      <div class="pane-header">
        <span>Launchers</span>
        <button type="button" disabled={launcherIds.length >= options.length} onclick={add}>Add</button>
      </div>
      {#if launcherIds.length === 0}
        <div class="empty">No Launchers selected.</div>
      {:else}
        <div class="launcher-list">
          {#each launcherIds as launcherId, index (`${launcherId}-${index}`)}
            <div class="launcher-row">
              <select value={launcherId} onchange={(event) => update(index, event.currentTarget.value)}>
                {#if !options.some((option) => option.value === launcherId)}
                  <option value={launcherId}>Missing Launcher ({launcherId})</option>
                {/if}
                {#each options as option}
                  {#if option.value === launcherId || !launcherIds.includes(option.value)}
                    <option value={option.value}>
                      {option.label ?? option.value}{option.detail == null ? '' : ` (${option.detail})`}
                    </option>
                  {/if}
                {/each}
              </select>
              <div class="actions">
                <IconButton label="Move Launcher up" disabled={index === 0} onclick={() => move(index, -1)}>
                  {#snippet icon()}<ArrowUp size={15} strokeWidth={2} />{/snippet}
                </IconButton>
                <IconButton label="Move Launcher down" disabled={index === launcherIds.length - 1} onclick={() => move(index, 1)}>
                  {#snippet icon()}<ArrowDown size={15} strokeWidth={2} />{/snippet}
                </IconButton>
                <IconButton label="Delete Launcher" onclick={() => remove(index)}>
                  {#snippet icon()}<Trash2 size={15} strokeWidth={2} />{/snippet}
                </IconButton>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </section>

    <section class="dependency-pane" aria-label="Bundle dependency preview">
      <div class="pane-header"><span>Dependency preview</span></div>
      {#if analysis.errors.length > 0}
        <div class="issues">
          {#each analysis.errors as issue}<div>{issue}</div>{/each}
        </div>
      {/if}
      <div class="dependency-section">
        <h3>Apps <span>{analysis.apps.length}</span></h3>
        {#if analysis.apps.length === 0}
          <div class="empty">No dependent Apps.</div>
        {:else}
          <div class="dependency-list">
            {#each analysis.apps as app (app.element.appId)}
              <div class="dependency-row"><span class="kind">App</span><span>{app.element.id}</span></div>
            {/each}
          </div>
        {/if}
      </div>
      <div class="dependency-section">
        <h3>Resources <span>{analysis.resources.length}</span></h3>
        {#if analysis.resources.length === 0}
          <div class="empty">No dependent Resources.</div>
        {:else}
          <div class="dependency-list">
            {#each analysis.resources as resource (resource.element.resourceId)}
              <div class="dependency-row">
                <span class="kind">{ReleaseBundle.getResourceKindLabel(resource.element)}</span>
                <span>{resource.element.id}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </section>
  </div>
</div>

<style>
  .bundle-editor { display:flex; flex-direction:column; height:100%; min-height:0; color:#2b4850; font-size:13px; }
  .editor-error { padding:0 0 7px; color:#b94755; font-weight:700; }
  .split-pane { display:grid; grid-template-columns:minmax(300px, 46%) minmax(320px, 1fr); flex:1 1 auto; min-height:0; border:1px solid var(--mbc-color-border-strong); border-radius:6px; background:rgba(250,253,254,.72); overflow:hidden; }
  .launcher-pane, .dependency-pane { display:grid; grid-template-rows:min-content minmax(0,1fr); align-content:start; gap:10px; min-width:0; min-height:0; padding:12px; overflow:auto; }
  .launcher-pane { border-right:1px solid var(--mbc-color-border-strong); background:#eef8fa; }
  .dependency-pane { display:block; background:#fbfefe; }
  .pane-header, .launcher-row, .actions, .dependency-row, h3 { display:flex; align-items:center; }
  .pane-header { justify-content:space-between; min-height:28px; color:#36545b; font-weight:800; }
  .pane-header button { height:28px; padding:0 12px; border:1px solid var(--mbc-color-border-strong); border-radius:6px; background:white; color:#236f7a; font:inherit; font-weight:700; }
  .pane-header button:disabled { opacity:.4; }
  .launcher-list, .dependency-list { display:grid; align-content:start; gap:8px; min-height:0; }
  .launcher-list { overflow:auto; }
  .launcher-row { gap:8px; padding:8px; border:1px solid rgba(154,203,212,.82); border-radius:6px; background:rgba(255,255,255,.82); }
  .launcher-row select { flex:1; min-width:0; height:32px; padding:0 8px; border:1px solid #9acbd4; border-radius:6px; background:white; color:#243f47; font:inherit; }
  .actions { gap:5px; }
  .issues { display:grid; gap:4px; margin:10px 0 14px; padding:10px; border:1px solid #e4a7af; border-radius:6px; background:#fff1f3; color:#b12f42; font-weight:700; }
  .dependency-section { margin-top:14px; }
  h3 { justify-content:space-between; margin:0 0 8px; color:#36545b; font-size:13px; }
  h3 span { color:#718c92; }
  .dependency-row { display:grid; grid-template-columns:100px minmax(0,1fr); gap:10px; padding:8px 10px; border:1px solid rgba(154,203,212,.65); border-radius:6px; background:#f4fbfc; font-weight:700; }
  .kind { color:#718c92; font-size:12px; }
  .empty { padding:12px; border:1px solid rgba(154,203,212,.55); border-radius:6px; background:rgba(244,251,252,.7); color:#718c92; }
</style>
