<script lang="ts">
  import CodeXml from '@lucide/svelte/icons/code-xml'
  import FilePlus from '@lucide/svelte/icons/file-plus'
  import FolderOpen from '@lucide/svelte/icons/folder-open'
  import { API_GEN, APP_VERSION, SCHEMA_GEN } from '../../version'
  import DevelopProjectController from '../develop-project-controller'
  import { translatorStore } from '@system/application/localization'
</script>

<section class="develop-home-screen" aria-label={$translatorStore('workspace.developHome.screen.label')}>
  <header class="screen-header">
    <div class="screen-title">
      <h1>{$translatorStore('workspace.developHome.screen.title')}</h1>
      <p>{$translatorStore('workspace.developHome.screen.description')}</p>
    </div>

    <aside class="compatibility" aria-label={$translatorStore('workspace.developHome.compatibility.label')}>
      <span class="compatibility-heading">{$translatorStore('workspace.developHome.compatibility.title')}</span>
      <dl>
        <div>
          <dt>Schema</dt>
          <dd>Gen {SCHEMA_GEN}</dd>
        </div>
        <div>
          <dt>API</dt>
          <dd>Gen {API_GEN}</dd>
        </div>
        <div>
          <dt>Mebaco</dt>
          <dd>{APP_VERSION}</dd>
        </div>
      </dl>
    </aside>
  </header>

  <main class="home-content">
    <section class="start-state" aria-labelledby="start-heading">
      <span class="start-icon" aria-hidden="true">
        <CodeXml size={28} strokeWidth={1.7} />
      </span>
      <h2 id="start-heading">{$translatorStore('workspace.developHome.start.title')}</h2>
      <p>{$translatorStore('workspace.developHome.start.description')}</p>
      <div class="actions">
        <button class="primary" type="button" onclick={DevelopProjectController.startEmpty}>
          <FilePlus size={16} strokeWidth={2.1} />
          {$translatorStore('workspace.developHome.action.newProject')}
        </button>
        <button type="button" onclick={DevelopProjectController.openFileWithAlert}>
          <FolderOpen size={16} strokeWidth={2.1} />
          {$translatorStore('workspace.developHome.action.openProject')}
        </button>
      </div>
    </section>

    <footer class="footer">(c) 2026 Mebaco</footer>
  </main>
</section>

<style>
  .develop-home-screen {
    display: grid;
    grid-template-rows: auto minmax(0, 1fr);
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #f7fbfc;
    color: var(--mbc-color-text);
    font-size: 13px;
  }

  .screen-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    min-height: 88px;
    padding: 13px 24px;
    border-bottom: 1px solid var(--mbc-color-border);
    background: rgba(255, 255, 255, 0.94);
  }

  h1,
  h2,
  p,
  dl,
  dd {
    margin: 0;
  }

  h1 {
    color: #263f46;
    font-size: 21px;
    line-height: 1.25;
  }

  .screen-title p {
    margin-top: 4px;
    color: var(--mbc-color-text-muted);
    font-size: 12px;
  }

  .compatibility {
    min-width: 330px;
    padding: 8px 12px 9px;
    border: 1px solid #cfe4e8;
    border-radius: 7px;
    background: var(--mbc-color-surface-soft);
    user-select: none;
  }

  .compatibility-heading {
    display: block;
    color: #5d7d84;
    font-size: 10px;
    font-weight: 800;
    letter-spacing: 0.07em;
    line-height: 1.2;
    text-transform: uppercase;
  }

  .compatibility dl {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
    margin-top: 5px;
  }

  .compatibility dl div {
    display: grid;
    grid-template-columns: auto auto;
    justify-content: start;
    gap: 6px;
    white-space: nowrap;
  }

  .compatibility dt {
    color: var(--mbc-color-text-subtle);
    font-size: 10px;
    line-height: 1.3;
  }

  .compatibility dd {
    color: #36545b;
    font-size: 11px;
    font-weight: 800;
    line-height: 1.3;
  }

  .home-content {
    position: relative;
    display: grid;
    place-items: center;
    min-height: 0;
    padding: 32px;
    background: var(--mbc-color-surface);
  }

  .start-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 28px;
    color: #82989e;
    text-align: center;
  }

  .start-icon {
    display: grid;
    place-items: center;
    width: 50px;
    height: 50px;
    margin-bottom: 3px;
    border-radius: 12px;
    background: #dff2f5;
    color: #2b8794;
  }

  h2 {
    color: #536e75;
    font-size: 16px;
    line-height: 1.35;
  }

  .start-state p {
    max-width: 360px;
    color: #82989e;
    font-size: 12px;
    line-height: 1.5;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
  }

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 7px;
    height: 34px;
    padding: 0 21px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 7px;
    background: var(--mbc-color-surface);
    color: #365a63;
    font-weight: 700;
    cursor: default;
    user-select: none;
  }

  button:hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
    color: #1f6270;
  }

  button.primary {
    border-color: #278f9e;
    background: var(--mbc-color-primary);
    color: white;
  }

  button.primary:hover {
    border-color: #1f7d89;
    background: var(--mbc-color-primary-hover);
    color: white;
  }

  button:focus-visible {
    outline: 3px solid var(--mbc-color-focus-ring);
    outline-offset: 2px;
  }

  .footer {
    position: absolute;
    right: 20px;
    bottom: 14px;
    color: var(--mbc-color-text-subtle);
    font-size: 11px;
    line-height: 1.4;
    user-select: none;
  }

  @media (max-width: 720px) {
    .screen-header {
      align-items: stretch;
      flex-direction: column;
      gap: 12px;
      padding: 15px 18px;
    }

    .compatibility {
      min-width: 0;
    }
  }

  @media (max-width: 420px) {
    .actions {
      align-items: stretch;
      flex-direction: column;
      width: 180px;
    }
  }
</style>
