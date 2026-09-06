<script lang="ts">
  import PackagePlus from '@lucide/svelte/icons/package-plus'
  import PackageOpen from '@lucide/svelte/icons/package-open'
  import Pencil from '@lucide/svelte/icons/pencil'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import ArrowRight from '@lucide/svelte/icons/arrow-right'
  import CircleCheck from '@lucide/svelte/icons/circle-check'
  import Boxes from '@lucide/svelte/icons/boxes'
  import Rocket from '@lucide/svelte/icons/rocket'
  import Database from '@lucide/svelte/icons/database'
  import ClientPackage from '../client-package'
  import ClientPackageController from '../client-package-controller'
  import ClientPackageStore from '../client-package-store'
  import ClientNavigation from '../client-navigation-store'

  const packageStore = ClientPackageStore.value
  let fileInput: HTMLInputElement
  let installing = $state(false)
  let renamingId = $state<string | null>(null)
  let renameValue = $state('')
  const selectedPackage = $derived(ClientPackageStore.getSelected($packageStore))

  const install = async (event: Event) => {
    const input = event.currentTarget as HTMLInputElement
    const file = input.files?.[0]
    input.value = ''
    if (file == null) return
    installing = true
    try {
      await ClientPackageController.installFile(file)
    } finally {
      installing = false
    }
  }

  const startRename = () => {
    if (selectedPackage == null) return
    renamingId = selectedPackage.installationId
    renameValue = selectedPackage.displayName
  }

  const saveRename = () => {
    if (renamingId == null || !ClientPackageStore.rename(renamingId, renameValue)) return
    renamingId = null
  }

  const formatBytes = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  }

  const formatDate = (source: string): string => {
    const date = new Date(source)
    return Number.isNaN(date.getTime()) ? source : date.toLocaleString()
  }
</script>

<section class="client-home-screen" aria-label="Installed application packages">
  <header class="screen-header">
    <div>
      <h1>Installed Packages</h1>
      <p>Manage Mebaco application packages and their launch configuration.</p>
    </div>
    <button class="install-button" type="button" disabled={installing} onclick={() => fileInput.click()}>
      <PackagePlus size={17} strokeWidth={2.2} />
      {installing ? 'Installing…' : 'Install App Package'}
    </button>
    <input bind:this={fileInput} class="file-input" type="file" accept=".mbcapp" onchange={install} />
  </header>

  <div class="split-pane">
    <aside class="package-pane" aria-label="Installed package list">
      <div class="pane-heading">
        <span>Packages</span>
        <span class="count">{$packageStore.packages.length}</span>
      </div>
      {#if $packageStore.packages.length === 0}
        <div class="list-empty">
          <PackageOpen size={34} strokeWidth={1.5} />
          <strong>No packages installed</strong>
          <span>Install a .mbcapp package to get started.</span>
        </div>
      {:else}
        <div class="package-list">
          {#each $packageStore.packages as item (item.installationId)}
            <button
              type="button"
              class="package-row"
              class:selected={$packageStore.selectedId === item.installationId}
              onclick={() => ClientPackageStore.select(item.installationId)}
            >
              <span class="package-icon"><PackageOpen size={18} strokeWidth={1.9} /></span>
              <span class="package-copy">
                <strong>{item.displayName}</strong>
                <span>{item.manifest.bundle.launcherCount} launcher{item.manifest.bundle.launcherCount === 1 ? '' : 's'}</span>
              </span>
              <span class="status-dot" title="Compatible"></span>
            </button>
          {/each}
        </div>
      {/if}
    </aside>

    <main class="detail-pane">
      {#if selectedPackage == null}
        <div class="detail-empty">
          <PackageOpen size={42} strokeWidth={1.35} />
          <strong>Select an application package</strong>
          <span>Package information and launch options will appear here.</span>
        </div>
      {:else}
        <header class="detail-header">
          <div class="detail-title">
            {#if renamingId === selectedPackage.installationId}
              <label for="package-display-name">Display name</label>
              <div class="rename-row">
                <input
                  id="package-display-name"
                  bind:value={renameValue}
                  maxlength="96"
                  onkeydown={(event) => {
                    if (event.key === 'Enter') saveRename()
                    if (event.key === 'Escape') renamingId = null
                  }}
                />
                <button type="button" class="compact primary" disabled={renameValue.trim().length === 0} onclick={saveRename}>Save</button>
                <button type="button" class="compact" onclick={() => renamingId = null}>Cancel</button>
              </div>
            {:else}
              <span class="eyebrow">Application Package</span>
              <h2>{selectedPackage.displayName}</h2>
              <span class="source-name">{selectedPackage.sourceFileName}</span>
            {/if}
          </div>
          {#if renamingId !== selectedPackage.installationId}
            <div class="detail-actions">
              <button type="button" onclick={startRename}><Pencil size={15} />Rename</button>
              <button class="danger" type="button" onclick={() => ClientPackageController.deletePackage(selectedPackage.installationId)}><Trash2 size={15} />Delete</button>
              <button class="primary" type="button" onclick={() => ClientNavigation.openLaunchSetup(selectedPackage.installationId)}>
                Launch Setup<ArrowRight size={16} />
              </button>
            </div>
          {/if}
        </header>

        <div class="detail-content">
          <section class="status-card">
            <span class="status-icon"><CircleCheck size={21} strokeWidth={2.2} /></span>
            <div>
              <strong>Compatible package</strong>
              <span>{selectedPackage.manifest.bundle.resourceCount === 0
                ? 'No resource paths are required.'
                : `${selectedPackage.manifest.bundle.resourceCount} resource path${selectedPackage.manifest.bundle.resourceCount === 1 ? '' : 's'} can be configured in Launch Setup.`}</span>
            </div>
          </section>

          <div class="information-grid">
            <section class="information-card">
              <h3>Package</h3>
              <dl>
                <div><dt>Bundle ID</dt><dd>{selectedPackage.manifest.bundle.id}</dd></div>
                <div><dt>Created</dt><dd>{formatDate(selectedPackage.manifest.createdAt)}</dd></div>
                <div><dt>File size</dt><dd>{formatBytes(selectedPackage.byteLength)}</dd></div>
                <div><dt>Format</dt><dd>mbcapp {selectedPackage.manifest.formatVersion}</dd></div>
                <div><dt>Schema / API</dt><dd>{selectedPackage.manifest.schemaGen} / {selectedPackage.manifest.apiGen}</dd></div>
                <div><dt>Created with</dt><dd>Mebaco {selectedPackage.manifest.appVersion}</dd></div>
              </dl>
            </section>

            <section class="information-card contents-card">
              <h3>Contents</h3>
              <div class="metrics">
                <div><Rocket size={18} /><strong>{selectedPackage.manifest.bundle.launcherCount}</strong><span>Launchers</span></div>
                <div><Boxes size={18} /><strong>{selectedPackage.manifest.bundle.appCount}</strong><span>Apps</span></div>
                <div><Database size={18} /><strong>{selectedPackage.manifest.bundle.resourceCount}</strong><span>Resources</span></div>
              </div>
              <div class="launcher-summary">
                <span>Included Launchers</span>
                {#each selectedPackage.module.launchers as launcher (launcher.launcherId)}
                  <div><Rocket size={14} /><strong>{ClientPackage.launcherLabel(launcher)}</strong><code>{launcher.id}</code></div>
                {/each}
              </div>
            </section>
          </div>
        </div>
      {/if}
    </main>
  </div>
</section>

<style>
  .client-home-screen { display:grid; grid-template-rows:auto minmax(0,1fr); width:100%; height:100%; overflow:hidden; background:#f7fbfc; color:var(--mbc-color-text); font-size:13px; }
  .screen-header { display:flex; align-items:center; justify-content:space-between; gap:24px; min-height:88px; padding:17px 24px 16px; border-bottom:1px solid var(--mbc-color-border); background:rgba(255,255,255,.94); }
  h1, h2, h3, p { margin:0; }
  h1 { color:#263f46; font-size:21px; line-height:1.25; }
  .screen-header p { margin-top:4px; color:var(--mbc-color-text-muted); font-size:12px; }
  button { display:inline-flex; align-items:center; justify-content:center; gap:7px; height:34px; padding:0 13px; border:1px solid var(--mbc-color-border-strong); border-radius:7px; background:white; color:#365a63; font-weight:700; cursor:default; }
  button:hover:not(:disabled) { border-color:var(--mbc-color-primary); background:var(--mbc-color-primary-soft); color:#1f6270; }
  button:focus-visible, input:focus-visible { outline:3px solid var(--mbc-color-focus-ring); outline-offset:2px; }
  button:disabled { opacity:.45; }
  button.primary, .install-button { border-color:#278f9e; background:#2aa7b8; color:white; }
  button.primary:hover:not(:disabled), .install-button:hover:not(:disabled) { border-color:#1f7d89; background:#218d9d; color:white; }
  button.danger { color:#a23f4b; }
  button.danger:hover { border-color:#d5929b; background:#fff0f2; color:#983643; }
  .file-input { display:none; }
  .split-pane { display:grid; grid-template-columns:minmax(270px, 31%) minmax(520px,1fr); min-height:0; }
  .package-pane { display:grid; grid-template-rows:48px minmax(0,1fr); min-width:0; min-height:0; border-right:1px solid var(--mbc-color-border-strong); background:#edf7f9; }
  .pane-heading { display:flex; align-items:center; justify-content:space-between; padding:0 16px; border-bottom:1px solid var(--mbc-color-border); color:#36545b; font-weight:800; }
  .count { display:grid; place-items:center; min-width:24px; height:21px; padding:0 7px; border-radius:11px; background:#d6edf1; color:#407078; font-size:11px; }
  .package-list { min-height:0; padding:9px; overflow:auto; }
  .package-row { display:grid; grid-template-columns:36px minmax(0,1fr) 10px; width:100%; height:auto; min-height:61px; margin-bottom:7px; padding:8px 10px; border-color:transparent; background:transparent; text-align:left; }
  .package-row:hover { background:rgba(255,255,255,.7); }
  .package-row.selected { border-color:#87c9d2; background:white; box-shadow:0 3px 11px rgba(40,120,132,.09); }
  .package-icon { display:grid; place-items:center; width:30px; height:30px; border-radius:7px; background:#dff2f5; color:#2b8794; }
  .package-copy { display:grid; gap:4px; min-width:0; }
  .package-copy strong { overflow:hidden; color:#2f4b52; font-size:13px; text-overflow:ellipsis; white-space:nowrap; }
  .package-copy span { color:#789097; font-size:11px; }
  .status-dot { width:8px; height:8px; border-radius:50%; background:#5ebc85; box-shadow:0 0 0 3px #e2f7ea; }
  .list-empty, .detail-empty { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:8px; padding:28px; color:#82989e; text-align:center; }
  .list-empty strong, .detail-empty strong { color:#536e75; font-size:13px; }
  .list-empty span, .detail-empty span { max-width:260px; font-size:12px; line-height:1.5; }
  .detail-pane { display:grid; grid-template-rows:auto minmax(0,1fr); min-width:0; min-height:0; background:white; }
  .detail-empty { height:100%; }
  .detail-header { display:flex; align-items:center; justify-content:space-between; gap:18px; min-height:91px; padding:15px 20px; border-bottom:1px solid var(--mbc-color-border); }
  .detail-title { display:grid; min-width:0; }
  .eyebrow { color:#6a8a91; font-size:10px; font-weight:800; letter-spacing:.08em; text-transform:uppercase; }
  h2 { margin-top:3px; overflow:hidden; color:#263f46; font-size:19px; text-overflow:ellipsis; white-space:nowrap; }
  .source-name { margin-top:4px; color:#82989e; font-size:11px; }
  .detail-actions { display:flex; flex-wrap:wrap; justify-content:flex-end; gap:7px; }
  .detail-actions .primary { margin-left:6px; }
  .detail-title label { margin-bottom:5px; color:#60777d; font-size:11px; font-weight:700; }
  .rename-row { display:flex; gap:6px; }
  .rename-row input { width:min(330px,35vw); height:34px; padding:0 10px; border:1px solid #83bec7; border-radius:6px; color:#263f46; font:inherit; font-weight:700; }
  button.compact { height:34px; padding:0 11px; }
  .detail-content { min-height:0; padding:18px 20px 26px; overflow:auto; }
  .status-card { display:flex; align-items:center; gap:12px; padding:13px 15px; border:1px solid #a9d9bd; border-radius:8px; background:#f1fbf5; }
  .status-icon { display:grid; place-items:center; width:34px; height:34px; border-radius:50%; background:#d8f3e2; color:#33855a; }
  .status-card div { display:grid; gap:3px; }
  .status-card strong { color:#2d6746; }
  .status-card div span { color:#5d7e69; font-size:11px; }
  .information-grid { display:grid; grid-template-columns:minmax(280px,.8fr) minmax(340px,1.2fr); gap:14px; margin-top:15px; }
  .information-card { padding:16px; border:1px solid var(--mbc-color-border); border-radius:8px; background:#fbfefe; }
  .information-card h3 { margin-bottom:14px; color:#36545b; font-size:13px; }
  dl { display:grid; gap:0; margin:0; }
  dl div { display:grid; grid-template-columns:110px minmax(0,1fr); gap:12px; padding:8px 0; border-top:1px solid #e8f1f3; }
  dl div:first-child { border-top:0; }
  dt { color:#7a9197; font-size:11px; }
  dd { margin:0; overflow-wrap:anywhere; color:#36545b; font-weight:700; }
  .metrics { display:grid; grid-template-columns:repeat(3,1fr); gap:8px; }
  .metrics div { display:grid; grid-template-columns:auto 1fr; align-items:center; gap:2px 7px; padding:10px; border:1px solid #d8eaed; border-radius:7px; background:white; color:#498089; }
  .metrics strong { color:#294a52; font-size:17px; }
  .metrics span { grid-column:1/-1; color:#80969b; font-size:10px; }
  .launcher-summary { display:grid; gap:6px; margin-top:16px; }
  .launcher-summary > span { color:#7a9197; font-size:11px; font-weight:700; }
  .launcher-summary div { display:grid; grid-template-columns:20px minmax(0,1fr) auto; align-items:center; gap:6px; padding:8px 9px; border-radius:6px; background:#edf7f9; color:#43808a; }
  .launcher-summary strong { overflow:hidden; color:#36545b; font-size:12px; text-overflow:ellipsis; white-space:nowrap; }
  .launcher-summary code { color:#758e94; font-family:Consolas,monospace; font-size:10px; }
  @media (max-width:850px) { .detail-header { align-items:flex-start; flex-direction:column; } .information-grid { grid-template-columns:1fr; } }
</style>
