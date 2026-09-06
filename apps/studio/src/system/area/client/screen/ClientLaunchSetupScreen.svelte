<script lang="ts">
  import { open } from '@tauri-apps/plugin-dialog'
  import Rocket from '@lucide/svelte/icons/rocket'
  import Boxes from '@lucide/svelte/icons/boxes'
  import Database from '@lucide/svelte/icons/database'
  import FolderOpen from '@lucide/svelte/icons/folder-open'
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert'
  import CircleCheck from '@lucide/svelte/icons/circle-check'
  import ClientPackage from '../client-package'
  import ClientPackageStore from '../client-package-store'
  import ClientNavigation from '../client-navigation-store'
  import ToastController from '../../../feedback/toast/toast-controller'

  let { installationId }: { installationId: string } = $props()
  const packageStore = ClientPackageStore.value
  const installedPackage = $derived(
    $packageStore.packages.find((item) => item.installationId === installationId) ?? null,
  )
  let selectedLauncherId = $state('')

  $effect(() => {
    if (installedPackage == null) return
    if (!installedPackage.module.launchers.some((item) => item.launcherId === selectedLauncherId)) {
      selectedLauncherId = installedPackage.module.launchers[0]?.launcherId ?? ''
    }
  })

  const selectedLauncher = $derived(
    installedPackage?.module.launchers.find((item) => item.launcherId === selectedLauncherId) ?? null,
  )
  const analysis = $derived.by(() => (
    installedPackage == null || selectedLauncherId.length === 0
      ? null
      : ClientPackage.analyzeLauncher(installedPackage, selectedLauncherId)
  ))
  const missingResources = $derived(
    analysis?.resources.filter((resource) => (
      (installedPackage?.resourcePaths[resource.element.resourceId] ?? '').trim().length === 0
    )) ?? [],
  )
  const ready = $derived(analysis != null && analysis.errors.length === 0 && missingResources.length === 0)

  const setPath = (resourceId: string, path: string) => {
    ClientPackageStore.setResourcePath(installationId, resourceId, path)
  }

  const browse = async (resource: NonNullable<typeof analysis>['resources'][number]) => {
    try {
      const selected = await open({
        title: `Select path for ${resource.element.id}`,
        multiple: false,
        directory: resource.element.kind === 'directory-resource',
        filters: resource.element.kind === 'sqlite-resource'
          ? [{ name: 'SQLite database', extensions: ['db', 'sqlite', 'sqlite3'] }]
          : undefined,
      })
      if (typeof selected === 'string') setPath(resource.element.resourceId, selected)
    } catch {
      ToastController.show('Path selection is available in the desktop application.', { tone: 'warning' })
    }
  }

  const launch = () => ToastController.show('Application launch will be implemented in the next step.', { tone: 'normal' })
</script>

{#if installedPackage == null}
  <section class="missing-package" aria-label="Missing application package">
    <TriangleAlert size={38} />
    <h1>Application package not found</h1>
    <p>The selected package is no longer installed.</p>
    <button type="button" onclick={ClientNavigation.openPackages}>Return to Packages</button>
  </section>
{:else}
  <section class="launch-setup-screen" aria-label="Application launch setup">
    <header class="screen-header">
      <div>
        <span class="eyebrow">{installedPackage.displayName}</span>
        <h1>Launch Setup</h1>
        <p>Select a Launcher and configure the resource paths it requires.</p>
      </div>
      <div class:ready class="readiness">
        {#if ready}<CircleCheck size={16} />Ready{:else}<TriangleAlert size={16} />Configuration required{/if}
      </div>
    </header>

    <div class="split-pane">
      <aside class="launcher-pane" aria-label="Launcher list">
        <div class="pane-heading">
          <span>Launchers</span>
          <span class="count">{installedPackage.module.launchers.length}</span>
        </div>
        <div class="launcher-list">
          {#each installedPackage.module.launchers as launcher (launcher.launcherId)}
            <button
              type="button"
              class="launcher-row"
              class:selected={selectedLauncherId === launcher.launcherId}
              onclick={() => selectedLauncherId = launcher.launcherId}
            >
              <span class="launcher-icon"><Rocket size={18} strokeWidth={1.9} /></span>
              <span class="launcher-copy">
                <strong>{ClientPackage.launcherLabel(launcher)}</strong>
                <span>{launcher.id}</span>
              </span>
            </button>
          {/each}
        </div>
      </aside>

      <main class="configuration-pane">
        {#if selectedLauncher == null || analysis == null}
          <div class="empty">Select a Launcher to configure it.</div>
        {:else}
          <header class="configuration-header">
            <div>
              <span class="eyebrow">Launcher</span>
              <h2>{ClientPackage.launcherLabel(selectedLauncher)}</h2>
              <code>{selectedLauncher.id}</code>
            </div>
            <button class="launch-button" type="button" disabled={!ready} onclick={launch}>
              <Rocket size={16} fill="currentColor" />Launch
            </button>
          </header>

          <div class="configuration-content">
            {#if analysis.errors.length > 0}
              <section class="issues">
                <h3><TriangleAlert size={16} />Package issues</h3>
                {#each analysis.errors as issue}<div>{issue}</div>{/each}
              </section>
            {/if}

            <section class="dependency-section">
              <div class="section-heading">
                <div><Boxes size={17} /><h3>Dependent Apps</h3></div>
                <span>{analysis.apps.length}</span>
              </div>
              {#if analysis.apps.length === 0}
                <div class="section-empty">No dependent Apps.</div>
              {:else}
                <div class="app-list">
                  {#each analysis.apps as app (app.element.appId)}
                    <div class="app-row"><span class="type">App</span><strong>{app.element.id}</strong><code>{app.element.appId}</code></div>
                  {/each}
                </div>
              {/if}
            </section>

            <section class="dependency-section resource-section">
              <div class="section-heading">
                <div><Database size={17} /><h3>Resources</h3></div>
                <span>{analysis.resources.length}</span>
              </div>
              {#if analysis.resources.length === 0}
                <div class="no-resources"><CircleCheck size={17} /><span>This Launcher does not require resource paths.</span></div>
              {:else}
                <div class="resource-list">
                  {#each analysis.resources as resource (resource.element.resourceId)}
                    {@const path = installedPackage.resourcePaths[resource.element.resourceId] ?? ''}
                    <div class="resource-row" class:missing={path.trim().length === 0}>
                      <div class="resource-title">
                        <div><strong>{resource.element.id}</strong><span>{ClientPackage.resourceKindLabel(resource.element)}</span></div>
                        {#if path.trim().length === 0}<span class="missing-label">Not specified</span>{:else}<span class="configured-label"><CircleCheck size={13} />Configured</span>{/if}
                      </div>
                      <label for={`resource-${resource.element.resourceId}`}>Path</label>
                      <div class="path-row">
                        <input
                          id={`resource-${resource.element.resourceId}`}
                          value={path}
                          placeholder={resource.element.kind === 'directory-resource' ? 'Select a directory' : 'Select a file'}
                          oninput={(event) => setPath(resource.element.resourceId, event.currentTarget.value)}
                        />
                        <button type="button" onclick={() => browse(resource)}><FolderOpen size={15} />Browse</button>
                      </div>
                    </div>
                  {/each}
                </div>
              {/if}
            </section>
          </div>
        {/if}
      </main>
    </div>
  </section>
{/if}

<style>
  .launch-setup-screen { display:grid; grid-template-rows:auto minmax(0,1fr); width:100%; height:100%; overflow:hidden; background:#f7fbfc; color:var(--mbc-color-text); font-size:13px; }
  .screen-header { display:flex; align-items:center; justify-content:space-between; gap:20px; min-height:88px; padding:15px 24px; border-bottom:1px solid var(--mbc-color-border); background:rgba(255,255,255,.94); }
  h1, h2, h3, p { margin:0; }
  .eyebrow { color:#67868d; font-size:10px; font-weight:800; letter-spacing:.07em; text-transform:uppercase; }
  h1 { margin-top:2px; color:#263f46; font-size:21px; }
  .screen-header p { margin-top:4px; color:#6e858b; font-size:12px; }
  .readiness { display:flex; align-items:center; gap:6px; padding:7px 10px; border:1px solid #e4aab2; border-radius:16px; background:#fff2f3; color:#ae4552; font-size:11px; font-weight:800; }
  .readiness.ready { border-color:#a9d9bd; background:#effaf3; color:#347c55; }
  .split-pane { display:grid; grid-template-columns:minmax(280px,32%) minmax(520px,1fr); min-height:0; }
  .launcher-pane { display:grid; grid-template-rows:48px minmax(0,1fr); min-width:0; min-height:0; border-right:1px solid var(--mbc-color-border-strong); background:#edf7f9; }
  .pane-heading { display:flex; align-items:center; justify-content:space-between; padding:0 16px; border-bottom:1px solid var(--mbc-color-border); color:#36545b; font-weight:800; }
  .count { display:grid; place-items:center; min-width:24px; height:21px; padding:0 7px; border-radius:11px; background:#d6edf1; color:#407078; font-size:11px; }
  .launcher-list { min-height:0; padding:9px; overflow:auto; }
  button { display:inline-flex; align-items:center; justify-content:center; gap:7px; height:34px; padding:0 13px; border:1px solid var(--mbc-color-border-strong); border-radius:7px; background:white; color:#365a63; font-weight:700; cursor:default; }
  button:hover:not(:disabled) { border-color:var(--mbc-color-primary); background:var(--mbc-color-primary-soft); color:#1f6270; }
  button:focus-visible, input:focus-visible { outline:3px solid var(--mbc-color-focus-ring); outline-offset:2px; }
  button:disabled { opacity:.45; }
  .launcher-row { display:grid; grid-template-columns:37px minmax(0,1fr); width:100%; height:auto; min-height:61px; margin-bottom:7px; padding:9px 10px; border-color:transparent; background:transparent; text-align:left; }
  .launcher-row.selected { border-color:#87c9d2; background:white; box-shadow:0 3px 11px rgba(40,120,132,.09); }
  .launcher-icon { display:grid; place-items:center; width:30px; height:30px; border-radius:7px; background:#dff2f5; color:#2b8794; }
  .launcher-copy { display:grid; gap:4px; min-width:0; }
  .launcher-copy strong { overflow:hidden; color:#2f4b52; text-overflow:ellipsis; white-space:nowrap; }
  .launcher-copy span { color:#789097; font-family:Consolas,monospace; font-size:10px; }
  .configuration-pane { display:grid; grid-template-rows:auto minmax(0,1fr); min-width:0; min-height:0; background:white; }
  .configuration-header { display:flex; align-items:center; justify-content:space-between; gap:18px; min-height:91px; padding:14px 20px; border-bottom:1px solid var(--mbc-color-border); }
  .configuration-header h2 { margin-top:3px; color:#263f46; font-size:19px; }
  .configuration-header code { display:block; margin-top:3px; color:#82989e; font-family:Consolas,monospace; font-size:10px; }
  .launch-button { min-width:104px; border-color:#278f9e; background:#2aa7b8; color:white; }
  .launch-button:hover:not(:disabled) { border-color:#1f7d89; background:#218d9d; color:white; }
  .configuration-content { min-height:0; padding:17px 20px 28px; overflow:auto; }
  .issues { display:grid; gap:5px; margin-bottom:15px; padding:12px; border:1px solid #e4aab2; border-radius:8px; background:#fff2f3; color:#a9414e; font-size:11px; font-weight:700; }
  .issues h3 { display:flex; align-items:center; gap:7px; margin-bottom:3px; font-size:12px; }
  .dependency-section { padding:15px; border:1px solid var(--mbc-color-border); border-radius:8px; background:#fbfefe; }
  .dependency-section + .dependency-section { margin-top:14px; }
  .section-heading, .section-heading div { display:flex; align-items:center; }
  .section-heading { justify-content:space-between; margin-bottom:12px; color:#4c7f87; }
  .section-heading div { gap:8px; }
  .section-heading h3 { color:#36545b; font-size:13px; }
  .section-heading > span { color:#718c92; font-size:11px; font-weight:800; }
  .app-list { display:grid; gap:6px; }
  .app-row { display:grid; grid-template-columns:65px minmax(120px,1fr) minmax(140px,1.2fr); align-items:center; gap:10px; padding:9px 11px; border:1px solid #d9eaed; border-radius:6px; background:white; }
  .app-row .type { color:#6f8d93; font-size:10px; font-weight:800; text-transform:uppercase; }
  .app-row strong { color:#36545b; }
  .app-row code { overflow:hidden; color:#85999e; font-family:Consolas,monospace; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
  .resource-list { display:grid; gap:9px; }
  .resource-row { padding:12px; border:1px solid #cde2e6; border-radius:7px; background:white; }
  .resource-row.missing { border-color:#e3abb3; background:#fffafb; }
  .resource-title { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px; }
  .resource-title > div { display:flex; align-items:baseline; gap:8px; }
  .resource-title strong { color:#36545b; }
  .resource-title div span { color:#789197; font-size:10px; }
  .missing-label { color:#b23e4d; font-size:10px; font-weight:800; }
  .configured-label { display:flex; align-items:center; gap:4px; color:#347c55; font-size:10px; font-weight:800; }
  .resource-row label { display:block; margin-bottom:4px; color:#718a90; font-size:10px; font-weight:700; }
  .path-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:7px; }
  .path-row input { min-width:0; height:34px; padding:0 10px; border:1px solid #aacdd3; border-radius:6px; background:white; color:#29464d; font:inherit; }
  .resource-row.missing .path-row input { border-color:#d99ba5; }
  .no-resources { display:flex; align-items:center; gap:8px; padding:11px; border-radius:6px; background:#effaf3; color:#47775a; font-size:11px; font-weight:700; }
  .section-empty, .empty { padding:20px; color:#7e959a; text-align:center; }
  .missing-package { display:grid; place-content:center; justify-items:center; gap:10px; width:100%; height:100%; background:#f7fbfc; color:#6c858b; font-size:13px; text-align:center; }
  .missing-package h1 { color:#324f56; font-size:20px; }
  .missing-package button { margin-top:8px; }
</style>
