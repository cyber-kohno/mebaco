<script lang="ts">
  import CodeMemberIdentifier from '@system/model/code-analysis/code-member-identifier'
  import {
    clearLanguagePreview,
    Language,
    setLanguagePreview,
    translatorStore,
  } from '@system/application/localization'
  import AppSettings from './app-settings-store'
  import { registerSettingNavigationGuard } from './setting-navigation-guard'
  import MonacoThemeCatalog from '../../ui/monaco/monaco-theme-catalog'
  import MonacoCodePreview from '../../ui/monaco/MonacoCodePreview.svelte'
  import type { AppArea } from '../navigation'

  type SettingCategory = 'general' | 'code-editor' | 'element-defaults'
  type FunctionSignatureMode = 'inline' | 'refer'
  type FunctionImplementationMode = 'code' | 'procedure'

  const currentGeneral = AppSettings.getGeneral()
  const currentElementDefaults = AppSettings.getElementDefaults()
  const currentCodeEditor = AppSettings.getCodeEditor()

  let activeCategory = $state<SettingCategory>('element-defaults')
  let baselineLanguage = $state(currentGeneral.language)
  let baselineDefaultArea = $state<AppArea>(currentGeneral.defaultArea)
  let baselineLoopItemVariableName = $state(currentElementDefaults.loopItemVariableName)
  let baselineLoopIndexVariableName = $state(currentElementDefaults.loopIndexVariableName)
  let baselineFunctionSignatureMode = $state<FunctionSignatureMode>(currentElementDefaults.functionSignatureMode)
  let baselineFunctionImplementationMode = $state<FunctionImplementationMode>(currentElementDefaults.functionImplementationMode)
  let baselineMonacoTheme = $state(currentCodeEditor.monacoTheme)
  let baselineMonacoFontSize = $state(currentCodeEditor.monacoFontSize)

  let language = $state(currentGeneral.language)
  let defaultArea = $state<AppArea>(currentGeneral.defaultArea)
  let loopItemVariableName = $state(currentElementDefaults.loopItemVariableName)
  let loopIndexVariableName = $state(currentElementDefaults.loopIndexVariableName)
  let functionSignatureMode = $state<FunctionSignatureMode>(currentElementDefaults.functionSignatureMode)
  let functionImplementationMode = $state<FunctionImplementationMode>(currentElementDefaults.functionImplementationMode)
  let monacoTheme = $state(currentCodeEditor.monacoTheme)
  let monacoFontSize = $state(String(currentCodeEditor.monacoFontSize))

  $effect(() => {
    clearLanguagePreview()
    const unregisterGuard = registerSettingNavigationGuard({
      hasChanges: () => hasChanges,
      discard: cancel,
    })
    return () => {
      unregisterGuard()
      clearLanguagePreview()
    }
  })

  const loopIndexError = $derived.by(() => {
    if (loopIndexVariableName.length === 0) return 'Enter an index variable name.'
    if (loopIndexVariableName.length > 32) return 'Use 32 characters or fewer.'
    return CodeMemberIdentifier.validate(loopIndexVariableName)
  })

  const loopItemError = $derived.by(() => {
    if (loopItemVariableName.length === 0) return 'Enter an item variable name.'
    if (loopItemVariableName.length > 32) return 'Use 32 characters or fewer.'
    return CodeMemberIdentifier.validate(loopItemVariableName)
  })

  const monacoFontSizeError = $derived.by(() => {
    const value = Number(monacoFontSize)
    if (monacoFontSize.trim().length === 0) return 'Enter a font size.'
    if (!Number.isInteger(value)) return 'Enter a whole number.'
    if (value < AppSettings.monacoFontSizeRange.min || value > AppSettings.monacoFontSizeRange.max) {
      return `Use ${AppSettings.monacoFontSizeRange.min}-${AppSettings.monacoFontSizeRange.max}px.`
    }
    return null
  })

  const hasChanges = $derived(
    language !== baselineLanguage
      || defaultArea !== baselineDefaultArea
      || loopItemVariableName !== baselineLoopItemVariableName
      || loopIndexVariableName !== baselineLoopIndexVariableName
      || functionSignatureMode !== baselineFunctionSignatureMode
      || functionImplementationMode !== baselineFunctionImplementationMode
      || monacoTheme !== baselineMonacoTheme
      || Number(monacoFontSize) !== baselineMonacoFontSize,
  )
  const canApply = $derived(
    hasChanges && loopItemError == null && loopIndexError == null && monacoFontSizeError == null,
  )

  const updateLanguage = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    if (!Language.isId(value)) return
    language = value
    setLanguagePreview(value)
  }

  const updateDefaultArea = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    if (value === 'client' || value === 'develop' || value === 'setting') defaultArea = value
  }

  const updateLoopItemVariableName = (event: Event) => {
    loopItemVariableName = (event.currentTarget as HTMLInputElement).value
  }

  const updateLoopIndexVariableName = (event: Event) => {
    loopIndexVariableName = (event.currentTarget as HTMLInputElement).value
  }

  const updateFunctionSignatureMode = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    if (value === 'inline' || value === 'refer') functionSignatureMode = value
  }

  const updateFunctionImplementationMode = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    if (value === 'code' || value === 'procedure') functionImplementationMode = value
  }

  const updateMonacoTheme = (event: Event) => {
    const value = (event.currentTarget as HTMLSelectElement).value
    if (MonacoThemeCatalog.isId(value)) monacoTheme = value
  }

  const updateMonacoFontSize = (event: Event) => {
    monacoFontSize = (event.currentTarget as HTMLInputElement).value
  }

  const apply = async () => {
    if (!canApply) return
    AppSettings.setLanguage(language)
    AppSettings.setDefaultArea(defaultArea)
    AppSettings.applyElementDefaults({
      loopItemVariableName,
      loopIndexVariableName,
      functionSignatureMode,
      functionImplementationMode,
    })
    AppSettings.applyCodeEditor({
      monacoTheme,
      monacoFontSize: Number(monacoFontSize),
    })
    await AppSettings.save()
    baselineLanguage = language
    baselineDefaultArea = defaultArea
    baselineLoopItemVariableName = loopItemVariableName
    baselineLoopIndexVariableName = loopIndexVariableName
    baselineFunctionSignatureMode = functionSignatureMode
    baselineFunctionImplementationMode = functionImplementationMode
    baselineMonacoTheme = monacoTheme
    baselineMonacoFontSize = Number(monacoFontSize)
    clearLanguagePreview()
  }

  const cancel = () => {
    language = baselineLanguage
    defaultArea = baselineDefaultArea
    loopItemVariableName = baselineLoopItemVariableName
    loopIndexVariableName = baselineLoopIndexVariableName
    functionSignatureMode = baselineFunctionSignatureMode
    functionImplementationMode = baselineFunctionImplementationMode
    monacoTheme = baselineMonacoTheme
    monacoFontSize = String(baselineMonacoFontSize)
    AppSettings.setLanguage(baselineLanguage)
    clearLanguagePreview()
  }

  const reset = () => {
    const defaults = AppSettings.getInitialState()
    language = defaults.general.language
    defaultArea = defaults.general.defaultArea
    loopItemVariableName = defaults.elementDefaults.loopItemVariableName
    loopIndexVariableName = defaults.elementDefaults.loopIndexVariableName
    functionSignatureMode = defaults.elementDefaults.functionSignatureMode
    functionImplementationMode = defaults.elementDefaults.functionImplementationMode
    monacoTheme = defaults.codeEditor.monacoTheme
    monacoFontSize = String(defaults.codeEditor.monacoFontSize)
    setLanguagePreview(language)
  }
</script>

<section class="setting-home-screen" aria-label={$translatorStore('settings.screen.label')}>
  <div class="setting-layout">
    <div
      class="setting-navigation"
      aria-label={$translatorStore('settings.category.navigation')}
      aria-orientation="vertical"
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        id="general-setting-tab"
        class:active={activeCategory === 'general'}
        aria-selected={activeCategory === 'general'}
        aria-controls="general-setting-panel"
        onclick={() => activeCategory = 'general'}
      >{$translatorStore('settings.category.general')}</button>
      <button
        type="button"
        role="tab"
        id="code-editor-setting-tab"
        class:active={activeCategory === 'code-editor'}
        aria-selected={activeCategory === 'code-editor'}
        aria-controls="code-editor-setting-panel"
        onclick={() => activeCategory = 'code-editor'}
      >{$translatorStore('settings.category.codeEditor')}</button>
      <button
        type="button"
        role="tab"
        id="element-defaults-setting-tab"
        class:active={activeCategory === 'element-defaults'}
        aria-selected={activeCategory === 'element-defaults'}
        aria-controls="element-defaults-setting-panel"
        onclick={() => activeCategory = 'element-defaults'}
      >{$translatorStore('settings.category.elementDefaults')}</button>
    </div>

    <div class="setting-content">
      <div class="setting-scroll">
      {#if activeCategory === 'general'}
        <div
          class="setting-panel"
          role="tabpanel"
          id="general-setting-panel"
          aria-labelledby="general-setting-tab"
        >
          <header class="panel-header">
            <h1>{$translatorStore('settings.category.general')}</h1>
            <p>{$translatorStore('settings.general.intro')}</p>
          </header>

          <section class="setting-group" aria-label={$translatorStore('settings.category.general')}>
            <div class="setting-row">
              <label for="display-language">
                <span class="setting-name">{$translatorStore('settings.general.language.display.label')}</span>
                <span class="setting-description">{$translatorStore('settings.general.language.display.description')}</span>
              </label>
              <div class="setting-control">
                <select
                  id="display-language"
                  value={language}
                  onchange={updateLanguage}
                >
                  {#each Language.definitions as language}
                    <option value={language.id}>{language.label}</option>
                  {/each}
                </select>
              </div>
            </div>

            <div class="setting-row">
              <label for="default-area">
                <span class="setting-name">{$translatorStore('settings.general.defaultArea.label')}</span>
                <span class="setting-description">{$translatorStore('settings.general.defaultArea.description')}</span>
              </label>
              <div class="setting-control">
                <select id="default-area" value={defaultArea} onchange={updateDefaultArea}>
                  <option value="client">{$translatorStore('shell.area.client')}</option>
                  <option value="develop">{$translatorStore('shell.area.develop')}</option>
                  <option value="setting">{$translatorStore('shell.area.setting')}</option>
                </select>
              </div>
            </div>
          </section>
        </div>
      {:else if activeCategory === 'code-editor'}
        <div
          class="setting-panel"
          role="tabpanel"
          id="code-editor-setting-panel"
          aria-labelledby="code-editor-setting-tab"
        >
          <header class="panel-header">
            <h1>{$translatorStore('settings.category.codeEditor')}</h1>
            <p>{$translatorStore('settings.codeEditor.intro')}</p>
          </header>

          <section class="setting-group" aria-label={$translatorStore('settings.category.codeEditor')}>
            <div class="setting-row">
              <label for="monaco-theme">
                <span class="setting-name">{$translatorStore('settings.codeEditor.theme.label')}</span>
                <span class="setting-description">{$translatorStore('settings.codeEditor.theme.description')}</span>
              </label>
              <div class="setting-control">
                <select
                  id="monaco-theme"
                  value={monacoTheme}
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
                <span class="setting-name">{$translatorStore('settings.codeEditor.fontSize.label')}</span>
                <span class="setting-description">{$translatorStore('settings.codeEditor.fontSize.description')}</span>
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

            <div class="setting-preview">
              <div class="setting-preview-label">{$translatorStore('settings.codeEditor.preview.label')}</div>
              <MonacoCodePreview
                themeId={monacoTheme}
                fontSize={monacoFontSizeError == null ? Number(monacoFontSize) : baselineMonacoFontSize}
              />
            </div>
          </section>
        </div>
      {:else}
        <div
          class="setting-panel"
          role="tabpanel"
          id="element-defaults-setting-panel"
          aria-labelledby="element-defaults-setting-tab"
        >
          <header class="panel-header">
            <h1>{$translatorStore('settings.category.elementDefaults')}</h1>
            <p>{$translatorStore('settings.elementDefaults.intro')}</p>
          </header>

          <section class="setting-group" aria-label={$translatorStore('settings.category.elementDefaults')}>
            <div class="setting-row">
              <label for="loop-item-variable">
                <span class="setting-name">{$translatorStore('settings.elementDefaults.creation.loopItem.label')}</span>
                <span class="setting-description">{$translatorStore('settings.elementDefaults.creation.loopItem.description')}</span>
              </label>
              <div class="setting-control">
                <input
                  id="loop-item-variable"
                  type="text"
                  value={loopItemVariableName}
                  aria-invalid={loopItemError != null}
                  aria-describedby={loopItemError == null ? undefined : 'loop-item-variable-error'}
                  autocomplete="off"
                  spellcheck="false"
                  oninput={updateLoopItemVariableName}
                />
                {#if loopItemError != null}
                  <span class="setting-error" id="loop-item-variable-error">{loopItemError}</span>
                {/if}
              </div>
            </div>

            <div class="setting-row">
              <label for="loop-index-variable">
                <span class="setting-name">{$translatorStore('settings.elementDefaults.creation.loopIndex.label')}</span>
                <span class="setting-description">{$translatorStore('settings.elementDefaults.creation.loopIndex.description')}</span>
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
                <span class="setting-name">{$translatorStore('settings.elementDefaults.creation.functionSignature.label')}</span>
                <span class="setting-description">{$translatorStore('settings.elementDefaults.creation.functionSignature.description')}</span>
              </label>
              <div class="setting-control">
                <select
                  id="function-signature-mode"
                  value={functionSignatureMode}
                  onchange={updateFunctionSignatureMode}
                >
                  <option value="inline">Inline</option>
                  <option value="refer">Refer</option>
                </select>
              </div>
            </div>

            <div class="setting-row">
              <label for="function-implementation-mode">
                <span class="setting-name">{$translatorStore('settings.elementDefaults.creation.functionImplementation.label')}</span>
                <span class="setting-description">{$translatorStore('settings.elementDefaults.creation.functionImplementation.description')}</span>
              </label>
              <div class="setting-control">
                <select
                  id="function-implementation-mode"
                  value={functionImplementationMode}
                  onchange={updateFunctionImplementationMode}
                >
                  <option value="code">Code</option>
                  <option value="procedure">Procedure</option>
                </select>
              </div>
            </div>
          </section>
        </div>
      {/if}
      </div>
      <footer class="setting-actions">
        <button type="button" class="reset-action" onclick={reset}>{$translatorStore('common.action.reset')}</button>
        <div class="setting-actions-right">
          <button type="button" disabled={!hasChanges} onclick={cancel}>{$translatorStore('common.action.cancel')}</button>
          <button type="button" class="apply-action" disabled={!canApply} onclick={apply}>{$translatorStore('common.action.apply')}</button>
        </div>
      </footer>
    </div>
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

  .setting-layout {
    display: grid;
    grid-template-columns: 190px minmax(0, 1fr);
    flex: 1 1 auto;
    min-height: 0;
  }

  .setting-navigation {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    padding: 20px 12px;
    border-right: 1px solid var(--mbc-color-border);
    background: var(--mbc-color-surface-soft);
  }

  .setting-navigation button {
    min-height: 36px;
    padding: 0 11px;
    border-radius: 4px;
    background: transparent;
    color: var(--mbc-color-text-muted);
    font-size: 13px;
    font-weight: 700;
    text-align: left;
    cursor: default;
  }

  .setting-navigation button:hover {
    background: var(--mbc-color-primary-soft);
    color: #236f7a;
  }

  .setting-navigation button.active {
    background: var(--mbc-color-primary-soft);
    box-shadow: inset 3px 0 0 var(--mbc-color-primary);
    color: #1f6270;
  }

  .setting-navigation button:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 3px solid var(--mbc-color-focus-ring);
    outline-offset: 2px;
  }

  .setting-content {
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
  }

  .setting-scroll {
    min-height: 0;
    flex: 1 1 auto;
    overflow: auto;
  }

  .setting-panel {
    width: min(760px, 100%);
    margin: 0;
    padding: 30px 32px 48px;
  }

  .panel-header {
    margin-bottom: 30px;
  }

  h1,
  p {
    margin: 0;
  }

  h1 {
    font-size: 20px;
    line-height: 1.4;
  }

  .panel-header p,
  .setting-description {
    color: var(--mbc-color-text-muted);
    line-height: 1.5;
  }

  .panel-header p {
    margin-top: 5px;
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

  .setting-preview {
    display: grid;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid var(--mbc-color-border);
  }

  .setting-preview-label {
    color: var(--mbc-color-text-muted);
    font-size: 12px;
    font-weight: 700;
  }

  .setting-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex: 0 0 auto;
    padding: 10px 32px;
    border-top: 1px solid var(--mbc-color-border);
    background: var(--mbc-color-surface-soft);
  }

  .setting-actions-right {
    display: flex;
    gap: 8px;
  }

  .setting-actions button {
    min-width: 84px;
    height: 34px;
    padding: 0 14px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: var(--mbc-color-surface);
    color: var(--mbc-color-text-muted);
    font: inherit;
    font-weight: 700;
  }

  .setting-actions button:hover:not(:disabled) {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
    color: #236f7a;
  }

  .setting-actions .apply-action {
    border-color: #278f9e;
    background: var(--mbc-color-primary);
    color: white;
  }

  .setting-actions .apply-action:hover:not(:disabled) {
    border-color: #1f7d89;
    background: var(--mbc-color-primary-hover);
    color: white;
  }

  .setting-actions button:disabled {
    opacity: 0.45;
  }

  @container setting-home (max-width: 620px) {
    .setting-layout {
      grid-template-rows: auto minmax(0, 1fr);
      grid-template-columns: minmax(0, 1fr);
    }

    .setting-navigation {
      flex-direction: row;
      overflow-x: auto;
      padding: 8px 12px;
      border-right: 0;
      border-bottom: 1px solid var(--mbc-color-border);
    }

    .setting-navigation button {
      flex: 0 0 auto;
      text-align: center;
    }

    .setting-navigation button.active {
      box-shadow: inset 0 -2px 0 var(--mbc-color-primary);
    }

    .setting-panel {
      padding: 24px 18px 36px;
    }

    .setting-actions {
      padding: 10px 18px;
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
