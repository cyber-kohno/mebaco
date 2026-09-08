<script lang="ts">
  import type ElementEditSchema from '../../../element-dialog/element-edit-schema'

  type Props = {
    value: string
    apps: readonly ElementEditSchema.DebugLaunchShortcutApp[]
    onValueChange: (value: string) => void
  }

  let { value, apps, onValueChange }: Props = $props()
  let selections = $state<Record<string, string>>({})
  let lastValue = $state('')

  const parse = (source: string): Record<string, string> => {
    try {
      const parsed: unknown = JSON.parse(source)
      if (!Array.isArray(parsed)) return {}
      return Object.fromEntries(parsed.flatMap((entry) => (
        typeof entry === 'object'
        && entry != null
        && typeof (entry as { appId?: unknown }).appId === 'string'
        && typeof (entry as { launcherId?: unknown }).launcherId === 'string'
          ? [[(entry as { appId: string }).appId, (entry as { launcherId: string }).launcherId]]
          : []
      )))
    } catch {
      return {}
    }
  }

  const serialize = (): string => JSON.stringify(apps.flatMap((app) => {
    const launcherId = selections[app.appId] ?? ''
    return app.hasLaunchArguments && launcherId.length > 0
      ? [{ appId: app.appId, launcherId }]
      : []
  }))

  $effect(() => {
    if (value === lastValue) return
    selections = parse(value)
    lastValue = value
  })

  const update = (appId: string, launcherId: string) => {
    selections = { ...selections, [appId]: launcherId }
    lastValue = serialize()
    onValueChange(lastValue)
  }
</script>

<section class="launch-shortcuts" aria-label="App launch shortcuts">
  {#if apps.length === 0}
    <div class="empty">No Apps are defined.</div>
  {:else}
    <div class="header" aria-hidden="true"><span>App</span><span>Shortcut launch</span></div>
    <div class="list">
      {#each apps as app (app.appId)}
        <label class="row">
          <span class="app-id">{app.label}</span>
          {#if app.hasLaunchArguments}
            <select value={selections[app.appId] ?? ''} onchange={(event) => update(app.appId, event.currentTarget.value)}>
              <option value="">Not configured</option>
              {#each app.launchers as launcher}
                <option value={launcher.value}>{launcher.label ?? launcher.value}{launcher.detail == null ? '' : ` (${launcher.detail})`}</option>
              {/each}
            </select>
          {:else}
            <span class="direct">Direct launch</span>
          {/if}
        </label>
      {/each}
    </div>
  {/if}
</section>

<style>
  .launch-shortcuts { display:grid; grid-template-rows:min-content minmax(0,1fr); min-height:0; overflow:hidden; }
  .header, .row { display:grid; grid-template-columns:minmax(160px,.8fr) minmax(260px,1.4fr); gap:12px; align-items:center; }
  .header { padding:0 10px 7px; color:#496970; font-size:12px; font-weight:700; }
  .list { display:grid; align-content:start; gap:8px; min-height:0; overflow:auto; }
  .row { padding:8px 10px; border:1px solid rgba(154,203,212,.82); border-radius:6px; background:rgba(244,251,252,.76); }
  .app-id { min-width:0; overflow:hidden; color:#2b4850; font-size:13px; font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
  select { min-width:0; height:32px; padding:0 9px; border:1px solid #9acbd4; border-radius:6px; background:white; color:#243f47; font:inherit; font-size:13px; }
  select:focus { border-color:var(--mbc-color-primary); outline:none; box-shadow:0 0 0 2px var(--mbc-color-primary-soft); }
  .direct { display:inline-flex; width:max-content; padding:4px 8px; border:1px solid #9fb56c; border-radius:4px; background:#eef6dc; color:#61752f; font-size:12px; font-weight:700; }
  .empty { padding:12px; border:1px solid rgba(154,203,212,.68); border-radius:6px; background:rgba(244,251,252,.8); color:#6d8990; font-size:13px; }
</style>
