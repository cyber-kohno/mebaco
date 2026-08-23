<script lang="ts">
  import { API_GEN, APP_VERSION, SCHEMA_GEN } from '../../version'
  import ProjectFile from '../../project/project-file'
</script>

<section class="start-screen" aria-label="Mebaco start">
  <div class="version-info" aria-label="Version information">
    <div>{`version ${APP_VERSION}`}</div>
    <div>{`schema gen: ${SCHEMA_GEN}`}</div>
    <div>{`api gen: ${API_GEN}`}</div>
  </div>

  <div class="brand-mark" aria-hidden="true">
    <img src="/favicon.svg" alt="" />
  </div>

  <div class="start-panel">
    <p class="lead">Start a project or open a .mbc file.</p>
    <div class="actions">
      <button type="button" onclick={ProjectFile.startEmpty}>Start Empty</button>
      <button type="button" class="secondary" onclick={ProjectFile.openFileWithAlert}>Open File</button>
    </div>
  </div>

  <footer class="footer">{`(c) 2026 Mebaco`}</footer>
</section>

<style>
  .start-screen {
    position: relative;
    display: grid;
    place-items: center;
    width: 100%;
    height: 100%;
    overflow: hidden;
    color: var(--mbc-color-text);
    background:
      linear-gradient(135deg, rgba(255, 255, 255, 0.74), rgba(255, 255, 255, 0.26)),
      var(--mbc-color-app-background);
  }

  .start-screen::before {
    content: '';
    position: absolute;
    inset: 16px;
    border: 1px solid rgba(185, 212, 218, 0.78);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.22);
    pointer-events: none;
  }

  .version-info {
    position: absolute;
    top: 24px;
    left: 26px;
    min-width: 190px;
    padding: 8px 14px;
    border: 1px solid rgba(214, 232, 236, 0.92);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.7);
    color: var(--mbc-color-text-muted);
    font-size: 13px;
    font-weight: 700;
    line-height: 19px;
    user-select: none;
  }

  .brand-mark {
    position: absolute;
    top: 28px;
    right: 30px;
    width: 42px;
    height: 42px;
    display: grid;
    place-items: center;
    opacity: 0.9;
  }

  .brand-mark img {
    width: 100%;
    height: 100%;
    display: block;
  }

  .start-panel {
    z-index: 1;
    display: grid;
    justify-items: center;
    gap: 26px;
    width: min(620px, calc(100% - 96px));
    padding: 34px 40px 38px;
    border: 1px solid var(--mbc-color-border);
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.82);
    box-shadow: 0 18px 48px rgba(42, 167, 184, 0.11);
  }

  .lead {
    margin: 0;
    color: #2b4850;
    font-size: 22px;
    font-weight: 700;
    line-height: 1.35;
    text-align: center;
  }

  .actions {
    display: grid;
    grid-template-columns: repeat(2, 220px);
    gap: 18px;
  }

  button {
    height: 64px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 8px;
    background: var(--mbc-color-primary-soft);
    color: #236f7a;
    font-size: 18px;
    font-weight: 700;
    line-height: 1;
    cursor: default;
    user-select: none;
    transition:
      background-color 120ms ease,
      border-color 120ms ease,
      color 120ms ease;
  }

  button.secondary {
    background: var(--mbc-color-primary-soft);
    color: #236f7a;
  }

  button:hover {
    border-color: var(--mbc-color-primary);
    background: #d2f1f5;
    color: #1f6270;
  }

  button:focus-visible {
    outline: 3px solid var(--mbc-color-focus-ring);
    outline-offset: 2px;
  }

  .footer {
    position: absolute;
    right: 26px;
    bottom: 20px;
    color: var(--mbc-color-text-subtle);
    font-size: 13px;
    font-weight: 700;
    line-height: 18px;
    user-select: none;
  }

  @media (max-width: 720px) {
    .actions {
      grid-template-columns: minmax(220px, 280px);
    }

    .lead {
      font-size: 20px;
    }
  }
</style>
