<script lang="ts">
  import { onDestroy } from 'svelte'
  import Rocket from '@lucide/svelte/icons/rocket'
  import Boxes from '@lucide/svelte/icons/boxes'
  import Database from '@lucide/svelte/icons/database'
  import FolderOpen from '@lucide/svelte/icons/folder-open'
  import TriangleAlert from '@lucide/svelte/icons/triangle-alert'
  import CircleCheck from '@lucide/svelte/icons/circle-check'
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import FileSymlink from '@lucide/svelte/icons/file-symlink'
  import ClientPackage from '../client-package'
  import ClientPackageStore from '../client-package-store'
  import NativeDialogController from '../../../ui/native-dialog-controller'
  import ClientNavigation from '../client-navigation-store'
  import ToastController from '../../../feedback/toast/toast-controller'
  import ClientResourcePathValidator from '../client-resource-path-validator'
  import ClientLauncher from '../client-launcher'
  import ClientLaunchShortcutController from '../client-launch-shortcut-controller'

  let { installationId }: { installationId: string } = $props()
  const packageStore = ClientPackageStore.value
  const installedPackage = $derived(
    $packageStore.packages.find((item) => item.installationId === installationId) ?? null,
  )
  let selectedLauncherId = $state<string | null>(null)
  let validationStates = $state<Record<string, ClientResourcePathValidator.State>>({})
  let validatedLauncherKey = ''
  let launchChecking = $state(false)
  let creatingShortcut = $state(false)
  const pathValidator = ClientResourcePathValidator.create((resourceId, state) => {
    validationStates = { ...validationStates, [resourceId]: state }
  })

  $effect(() => {
    if (
      selectedLauncherId != null
      && !installedPackage?.module.launchers.some((item) => item.launcherId === selectedLauncherId)
    ) {
      selectedLauncherId = null
    }
  })

  const selectedLauncher = $derived(
    installedPackage?.module.launchers.find((item) => item.launcherId === selectedLauncherId) ?? null,
  )
  const analysis = $derived.by(() => (
    installedPackage == null || selectedLauncherId == null
      ? null
      : ClientPackage.analyzeLauncher(installedPackage, selectedLauncherId)
  ))
  const resourcesReady = $derived(
    analysis?.resources.every((resource) => {
      const path = installedPackage?.resourcePaths[resource.element.resourceId] ?? ''
      const state = validationStates[resource.element.resourceId]
      return state?.path === path && ClientResourcePathValidator.isAccepted(state)
    }) ?? false,
  )
  const checkingResources = $derived(
    analysis?.resources.some((resource) => (
      validationStates[resource.element.resourceId]?.status === 'checking'
    )) ?? false,
  )
  const ready = $derived(
    analysis != null && analysis.errors.length === 0 && resourcesReady && !launchChecking,
  )

  $effect(() => {
    const launcherKey = `${installationId}:${selectedLauncherId ?? ''}`
    if (launcherKey === validatedLauncherKey) return
    validatedLauncherKey = launcherKey
    pathValidator.cancelAll()
    validationStates = {}
    if (installedPackage == null || analysis == null) return
    analysis.resources.forEach((resource) => {
      const path = installedPackage.resourcePaths[resource.element.resourceId] ?? ''
      void pathValidator.checkNow(resource.element, path)
    })
  })

  onDestroy(() => pathValidator.dispose())

  const setPath = (
    resource: NonNullable<typeof analysis>['resources'][number],
    path: string,
    immediate = false,
  ) => {
    ClientPackageStore.setResourcePath(installationId, resource.element.resourceId, path)
    if (immediate) void pathValidator.checkNow(resource.element, path)
    else pathValidator.schedule(resource.element, path)
  }

  const getValidation = (
    resource: NonNullable<typeof analysis>['resources'][number],
    path: string,
  ): ClientResourcePathValidator.State => {
    const state = validationStates[resource.element.resourceId]
    if (state?.path === path) return state
    return { path, status: path.trim().length === 0 ? 'not-specified' : 'checking' }
  }

  const browse = async (resource: NonNullable<typeof analysis>['resources'][number]) => {
    try {
      const selected = await NativeDialogController.open({
        title: `Select path for ${ClientPackage.resourceLabel(resource.element)}`,
        multiple: false,
        directory: resource.element.kind === 'directory-resource',
        filters: resource.element.kind === 'sqlite-resource'
          ? [{ name: 'SQLite database', extensions: ['db', 'sqlite', 'sqlite3'] }]
          : undefined,
      })
      if (typeof selected === 'string') setPath(resource, selected, true)
    } catch {
      ToastController.show('Path selection is available in the desktop application.', { tone: 'warning' })
    }
  }

  const launch = async () => {
    if (
      installedPackage == null
      || selectedLauncher == null
      || selectedLauncher.appId == null
      || analysis == null
      || analysis.errors.length > 0
    ) return
    launchChecking = true
    try {
      const result = await ClientLauncher.open(installedPackage, selectedLauncher.launcherId, {
        validateResource: async (resource, path) => {
          const state = await pathValidator.checkNow(resource, path)
          return state != null && ClientResourcePathValidator.isAccepted(state)
        },
      })
      if (
        result.status !== 'opened'
        && result.message !== 'The Launcher resource configuration is incomplete.'
      ) {
        ToastController.show(result.message, { tone: 'danger' })
      }
    } finally {
      launchChecking = false
    }
  }

  const createShortcut = async () => {
    if (installedPackage == null || selectedLauncher == null || !ready) return
    creatingShortcut = true
    try {
      const result = await ClientLaunchShortcutController.create(
        installedPackage,
        selectedLauncher.launcherId,
      )
      if (result === 'saved') {
        ToastController.show('Launcher shortcut created.', { tone: 'success' })
      }
    } catch (error) {
      ToastController.show(
        error instanceof Error ? error.message : 'The Launcher shortcut could not be created.',
        { tone: 'danger', durationMs: 5000 },
      )
    } finally {
      creatingShortcut = false
    }
  }
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
      {#if selectedLauncher != null}
        <div class:ready class:checking={launchChecking || checkingResources} class="readiness">
          {#if launchChecking || checkingResources}
            <LoaderCircle class="spinner" size={16} />Checking resources
          {:else if ready}
            <CircleCheck size={16} />Ready
          {:else}
            <TriangleAlert size={16} />Configuration required
          {/if}
        </div>
      {/if}
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
              aria-pressed={selectedLauncherId === launcher.launcherId}
              onclick={() => selectedLauncherId = selectedLauncherId === launcher.launcherId ? null : launcher.launcherId}
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
            <div class="configuration-actions">
              <button
                class="shortcut-button"
                type="button"
                disabled={!ready || creatingShortcut}
                title={ready ? 'Create a Windows shortcut for this Launcher' : 'Complete the Launcher configuration first'}
                onclick={() => { void createShortcut() }}
              >
                {#if creatingShortcut}<LoaderCircle class="spinner" size={16} />{:else}<FileSymlink size={16} />{/if}
                Create Shortcut
              </button>
              <button class="launch-button" type="button" disabled={!ready} onclick={() => { void launch() }}>
                {#if launchChecking}<LoaderCircle class="spinner" size={16} />{:else}<Rocket size={16} fill="currentColor" />{/if}
                Launch
              </button>
            </div>
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
                    {@const validation = getValidation(resource, path)}
                    <div class="resource-row" data-validation={validation.status}>
                      <div class="resource-title">
                        <div><strong>{ClientPackage.resourceLabel(resource.element)}</strong><span>{ClientPackage.resourceKindLabel(resource.element)}</span></div>
                        <span
                          class="validation-label"
                          data-status={validation.status}
                          title={validation.detail ?? undefined}
                          aria-live="polite"
                        >
                          {#if validation.status === 'checking'}
                            <LoaderCircle class="spinner" size={13} />
                          {:else if ClientResourcePathValidator.isAccepted(validation)}
                            <CircleCheck size={13} />
                          {:else}
                            <TriangleAlert size={13} />
                          {/if}
                          {ClientResourcePathValidator.getMessage(validation, resource.element)}
                        </span>
                      </div>
                      <label for={`resource-${resource.element.resourceId}`}>Path</label>
                      <div class="path-row">
                        <input
                          id={`resource-${resource.element.resourceId}`}
                          value={path}
                          placeholder={resource.element.kind === 'directory-resource' ? 'Select a directory' : 'Select a file'}
                          oninput={(event) => setPath(resource, event.currentTarget.value)}
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
  .readiness.checking { border-color:#b9d4d9; background:#f2f8f9; color:#58767d; }
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
  .launcher-row:hover:not(.selected) { border-color:transparent; background:rgba(255,255,255,.38); color:inherit; }
  .launcher-row.selected, .launcher-row.selected:hover { border-color:#5daebb; background:#dff3f6; box-shadow:inset 4px 0 #278f9e,0 3px 11px rgba(40,120,132,.14); }
  .launcher-row.selected .launcher-icon { background:#bfe6eb; color:#176f7c; }
  .launcher-icon { display:grid; place-items:center; width:30px; height:30px; border-radius:7px; background:#dff2f5; color:#2b8794; }
  .launcher-copy { display:grid; gap:4px; min-width:0; }
  .launcher-copy strong { overflow:hidden; color:#2f4b52; text-overflow:ellipsis; white-space:nowrap; }
  .launcher-copy span { color:#789097; font-family:Consolas,monospace; font-size:10px; }
  .configuration-pane { display:grid; grid-template-rows:auto minmax(0,1fr); min-width:0; min-height:0; background:white; }
  .configuration-header { display:flex; align-items:center; justify-content:space-between; gap:18px; min-height:91px; padding:14px 20px; border-bottom:1px solid var(--mbc-color-border); }
  .configuration-header h2 { margin-top:3px; color:#263f46; font-size:19px; }
  .configuration-header code { display:block; margin-top:3px; color:#82989e; font-family:Consolas,monospace; font-size:10px; }
  .configuration-actions { display:flex; align-items:center; gap:8px; }
  .shortcut-button { min-width:148px; }
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
  .resource-row[data-validation='valid'] { border-color:#a9d9bd; background:#fbfffc; }
  .resource-row[data-validation='creatable'] { border-color:#dfc98d; background:#fffdf7; }
  .resource-row:not([data-validation='valid']):not([data-validation='creatable']):not([data-validation='checking']) { border-color:#e3abb3; background:#fffafb; }
  .resource-title { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; margin-bottom:10px; }
  .resource-title > div { display:flex; align-items:baseline; gap:8px; }
  .resource-title strong { color:#36545b; }
  .resource-title div span { color:#789197; font-size:10px; }
  .validation-label { display:flex; align-items:center; justify-content:flex-end; gap:4px; max-width:60%; color:#b23e4d; font-size:10px; font-weight:800; text-align:right; }
  .validation-label[data-status='checking'] { color:#647f86; }
  .validation-label[data-status='valid'] { color:#347c55; }
  .validation-label[data-status='creatable'] { color:#8b6a19; }
  .resource-row label { display:block; margin-bottom:4px; color:#718a90; font-size:10px; font-weight:700; }
  .path-row { display:grid; grid-template-columns:minmax(0,1fr) auto; gap:7px; }
  .path-row input { min-width:0; height:34px; padding:0 10px; border:1px solid #aacdd3; border-radius:6px; background:white; color:#29464d; font:inherit; }
  .resource-row[data-validation='valid'] .path-row input { border-color:#8bc7a2; }
  .resource-row[data-validation='creatable'] .path-row input { border-color:#d1b968; }
  .resource-row:not([data-validation='valid']):not([data-validation='creatable']):not([data-validation='checking']) .path-row input { border-color:#d99ba5; }
  :global(.spinner) { animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  .no-resources { display:flex; align-items:center; gap:8px; padding:11px; border-radius:6px; background:#effaf3; color:#47775a; font-size:11px; font-weight:700; }
  .section-empty, .empty { padding:20px; color:#7e959a; text-align:center; }
  .missing-package { display:grid; place-content:center; justify-items:center; gap:10px; width:100%; height:100%; background:#f7fbfc; color:#6c858b; font-size:13px; text-align:center; }
  .missing-package h1 { color:#324f56; font-size:20px; }
  .missing-package button { margin-top:8px; }
</style>
