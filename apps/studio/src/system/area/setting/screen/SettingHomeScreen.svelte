<script lang="ts">
  import CodeMemberIdentifier from '../../../element/code-member-identifier'
  import AppSettings, { appSettingsStore } from '../../../settings/app-settings-store'
  import MonacoThemeCatalog from '../../../ui/monaco/monaco-theme-catalog'

  type SettingTab = 'client' | 'develop'

  let activeTab = $state<SettingTab>('develop')
  let loopIndexVariableName = $state(
    AppSettings.getDevelopDefaults().loopIndexVariableName,
  )
  let monacoFontSize = $state(String(
    AppSettings.getDevelopEditor().monacoFontSize,
  ))

  const loopIndexError = $derived.by(() => {
    if (loopIndexVariableName.length === 0) return 'Enter an index variable name.'
    if (loopIndexVariableName.length > 32) return 'Use 32 characters or fewer.'
    return CodeMemberIdentifier.validate(loopIndexVariableName)
  })

  const monacoFontSizeError = $derived.by(() => {
    const value = Number(monacoFontSize)
    if (monacoFontSize.trim().length === 0) return 'Enter a font size.'
    if (!Number.isInteger(value)) return 'Enter a whole number.'
    if (
      value < AppSettings.monacoFontSizeRange.min
      || value > AppSettings.monacoFontSizeRange.max
    ) {
      return `Use ${AppSettings.monacoFontSizeRange.min}–${AppSettings.monacoFontSizeRange.max}px.`
    }
    return null
  })

  const updateLoopIndexVariableName = (event: Event) => {
    loopIndexVariableName = (event.currentTarget as HTMLInputElement).value
    if (loopIndexError == null) {
      AppSettings.setLoopIndexVariableName(loopIndexVariableName)
    }
  }

  const updateFunctionSignatureMode = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    if (value === 'inline' || value === 'refer') {
      AppSettings.setFunctionSignatureMode(value)
    }
  }

  const updateMonacoTheme = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    if (MonacoThemeCatalog.isId(value)) AppSettings.setMonacoTheme(value)
  }

  const updateMonacoFontSize = (event: Event) => {
    monacoFontSize = (event.currentTarget as HTMLInputElement).value
    if (monacoFontSizeError == null) {
      AppSettings.setMonacoFontSize(Number(monacoFontSize))
    }
  }
</script>

<section class="setting-home-screen" aria-label="Mebaco settings">
  <div class="setting-tabs" aria-label="Setting category" role="tablist">
    <button
      type="button"
      role="tab"
      id="client-setting-tab"
      class:active={activeTab === 'client'}
      aria-selected={activeTab === 'client'}
      aria-controls="client-setting-panel"
      onclick={() => activeTab = 'client'}
    >Client</button>
    <button
      type="button"
      role="tab"
      id="develop-setting-tab"
      class:active={activeTab === 'develop'}
      aria-selected={activeTab === 'develop'}
      aria-controls="develop-setting-panel"
      onclick={() => activeTab = 'develop'}
    >Develop</button>
  </div>

  <div class="setting-content">
    {#if activeTab === 'client'}
      <div
        class="setting-panel empty-panel"
        role="tabpanel"
        id="client-setting-panel"
        aria-labelledby="client-setting-tab"
      >
        <h1>Client settings</h1>
        <p>There are no Client settings yet.</p>
      </div>
    {:else}
      <div
        class="setting-panel"
        role="tabpanel"
        id="develop-setting-panel"
        aria-labelledby="develop-setting-tab"
      >
        <header class="panel-header">
          <h1>Develop settings</h1>
          <p>Configure element creation defaults and editor preferences.</p>
        </header>

        <section class="setting-group" aria-labelledby="element-defaults-heading">
          <header class="group-header">
            <h2 id="element-defaults-heading">Element defaults</h2>
            <p>Changes apply to elements created after the setting is changed.</p>
          </header>

          <div class="setting-row">
            <label for="loop-index-variable">
              <span class="setting-name">Loop index variable</span>
              <span class="setting-description">Default index variable name for Loop elements.</span>
            </label>
            <div class="setting-control">
              <input
                id="loop-index-variable"
                type="text"
                value={loopIndexVariableName}
                aria-invalid={loopIndexError != null}
                aria-describedby={loopIndexError == null ? undefined : 'loop-index-variable-error'}
                autocomplete="off"
                spellcheck="false"
                oninput={updateLoopIndexVariableName}
              />
              {#if loopIndexError != null}
                <span class="setting-error" id="loop-index-variable-error">{loopIndexError}</span>
              {/if}
            </div>
          </div>

          <div class="setting-row">
            <label for="function-signature-mode">
              <span class="setting-name">Function signature</span>
              <span class="setting-description">Default signature source for Function elements.</span>
            </label>
            <div class="setting-control">
              <select
                id="function-signature-mode"
                value={AppSettings.getDevelopDefaults().functionSignatureMode}
                onchange={updateFunctionSignatureMode}
              >
                <option value="inline">Inline</option>
                <option value="refer">Node reference</option>
              </select>
            </div>
          </div>
        </section>

        <section class="setting-group" aria-labelledby="editor-settings-heading">
          <header class="group-header">
            <h2 id="editor-settings-heading">Editor</h2>
            <p>Changes apply to open and newly created code editors.</p>
          </header>

          <div class="setting-row">
            <label for="monaco-theme">
              <span class="setting-name">Monaco theme</span>
              <span class="setting-description">Color theme used by TypeScript editors.</span>
            </label>
            <div class="setting-control">
              <select
                id="monaco-theme"
                value={$appSettingsStore.develop.editor.monacoTheme}
                onchange={updateMonacoTheme}
              >
                {#each MonacoThemeCatalog.themes as theme}
                  <option value={theme.id}>{theme.label}</option>
                {/each}
              </select>
            </div>
          </div>

          <div class="setting-row">
            <label for="monaco-font-size">
              <span class="setting-name">Monaco font size</span>
              <span class="setting-description">Font size used by TypeScript editors.</span>
            </label>
            <div class="setting-control">
              <input
                id="monaco-font-size"
                type="number"
                min={AppSettings.monacoFontSizeRange.min}
                max={AppSettings.monacoFontSizeRange.max}
                step="1"
                value={monacoFontSize}
                aria-invalid={monacoFontSizeError != null}
                aria-describedby={monacoFontSizeError == null ? undefined : 'monaco-font-size-error'}
                oninput={updateMonacoFontSize}
              />
              {#if monacoFontSizeError != null}
                <span class="setting-error" id="monaco-font-size-error">{monacoFontSizeError}</span>
              {/if}
            </div>
          </div>
        </section>
      </div>
    {/if}
  </div>
</section>

<style>
  .setting-home-screen {
    container-name: setting-home;
    container-type: inline-size;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: var(--mbc-color-surface);
    color: var(--mbc-color-text);
    font-size: 13px;
  }

  .setting-tabs {
    flex: 0 0 44px;
    display: flex;
    align-items: stretch;
    gap: 4px;
    padding: 0 24px;
    border-bottom: 1px solid var(--mbc-color-border);
    background: var(--mbc-color-surface);
  }

  .setting-tabs button {
    min-width: 96px;
    padding: 0 16px;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--mbc-color-text-muted);
    font-size: 13px;
    font-weight: 700;
    cursor: default;
  }

  .setting-tabs button:hover {
    background: var(--mbc-color-primary-soft);
    color: #236f7a;
  }

  .setting-tabs button.active {
    border-bottom-color: var(--mbc-color-primary);
    color: #1f6270;
  }

  .setting-tabs button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid var(--mbc-color-focus-ring);
    outline-offset: 2px;
  }

  .setting-content {
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  }

  .setting-panel {
    width: min(760px, 100%);
    margin: 0 auto;
    padding: 30px 32px 48px;
  }

  .panel-header {
    margin-bottom: 30px;
  }

  h1,
  h2,
  p {
    margin: 0;
  }

  h1 {
    font-size: 20px;
    line-height: 1.4;
  }

  h2 {
    font-size: 15px;
    line-height: 1.4;
  }

  .panel-header p,
  .group-header p,
  .empty-panel p,
  .setting-description {
    color: var(--mbc-color-text-muted);
    line-height: 1.5;
  }

  .panel-header p {
    margin-top: 5px;
  }

  .group-header {
    margin-bottom: 12px;
  }

  .setting-group + .setting-group {
    margin-top: 32px;
  }

  .group-header p {
    margin-top: 4px;
    font-size: 12px;
  }

  .setting-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 220px;
    gap: 28px;
    align-items: start;
    padding: 16px 0;
    border-top: 1px solid var(--mbc-color-border);
  }

  .setting-row:last-child {
    border-bottom: 1px solid var(--mbc-color-border);
  }

  .setting-row label {
    display: grid;
    gap: 3px;
    padding-top: 7px;
  }

  .setting-name {
    font-weight: 700;
    line-height: 1.4;
  }

  .setting-description {
    font-size: 12px;
  }

  .setting-control {
    display: grid;
    gap: 5px;
  }

  input,
  select {
    width: 100%;
    height: 34px;
    padding: 0 9px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: var(--mbc-color-surface);
    color: var(--mbc-color-text);
  }

  input:hover,
  select:hover {
    border-color: var(--mbc-color-primary);
  }

  input[aria-invalid='true'] {
    border-color: var(--mbc-color-validation-error-strong);
    background: var(--mbc-color-validation-error);
  }

  .setting-error {
    color: var(--mbc-color-validation-error-strong);
    font-size: 12px;
    line-height: 1.4;
  }

  .empty-panel p {
    margin-top: 6px;
  }

  @container setting-home (max-width: 620px) {
    .setting-tabs {
      padding: 0 12px;
    }

    .setting-tabs button {
      flex: 1 1 0;
      min-width: 0;
    }

    .setting-panel {
      padding: 24px 18px 36px;
    }

    .setting-row {
      grid-template-columns: minmax(0, 1fr);
      gap: 10px;
    }

    .setting-row label {
      padding-top: 0;
    }
  }
</style>
