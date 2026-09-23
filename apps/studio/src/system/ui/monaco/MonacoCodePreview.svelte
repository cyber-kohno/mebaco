<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte'
  import type * as Monaco from 'monaco-editor'
  import { MonacoFactory } from '@system/infra/monaco/factory'
  import MonacoThemeCatalog from './monaco-theme-catalog'
  import MonacoThemeController from './monaco-theme-controller'

  type Props = {
    themeId: MonacoThemeCatalog.Id
    fontSize: number
    height?: string
  }

  let {
    themeId,
    fontSize,
    height = '180px',
  }: Props = $props()

  const source = `function greet(name: string): string {
  return \`Hello, \${name}\`
}

const message = greet('Mebaco')`
  const uid = crypto.randomUUID()
  let container: HTMLDivElement | null = null
  let editor = $state<Monaco.editor.IStandaloneCodeEditor | null>(null)
  let monaco = $state<typeof Monaco | null>(null)
  let model: Monaco.editor.ITextModel | null = null
  let disconnectTheme: (() => void) | null = null
  let activeTheme = $state(MonacoThemeCatalog.get(MonacoThemeCatalog.defaultId))
  let destroyed = false

  $effect(() => {
    const theme = MonacoThemeCatalog.get(themeId)
    activeTheme = theme
    monaco?.editor.setTheme(theme.monacoThemeName)
    editor?.updateOptions({ fontSize })
  })

  onMount(async () => {
    if (container == null) return
    const mountContainer = container
    monaco = await MonacoFactory.createMonaco()
    await tick()
    if (destroyed || container !== mountContainer || !mountContainer.isConnected || monaco == null) return

    disconnectTheme = MonacoThemeController.connect(monaco, () => {})
    activeTheme = MonacoThemeCatalog.get(themeId)
    monaco.editor.setTheme(activeTheme.monacoThemeName)

    model = MonacoFactory.createModel(
      monaco,
      source,
      monaco.Uri.parse(`inmemory://mebaco/preview-${uid}.ts`),
    )
    editor = monaco.editor.create(mountContainer, {
      model,
      language: 'typescript',
      theme: activeTheme.monacoThemeName,
      readOnly: true,
      domReadOnly: true,
      automaticLayout: true,
      minimap: { enabled: false },
      fontSize,
      lineNumbersMinChars: 3,
      scrollBeyondLastLine: false,
      tabSize: 2,
      wordWrap: 'on',
      folding: false,
      glyphMargin: false,
      padding: { top: 8, bottom: 8 },
      contextmenu: false,
      overviewRulerLanes: 0,
      scrollbar: {
        vertical: 'hidden',
        horizontal: 'hidden',
      },
    })
  })

  onDestroy(() => {
    destroyed = true
    disconnectTheme?.()
    editor?.dispose()
    model?.dispose()
  })
</script>

<div
  class="preview-frame"
  style:height
  style:background={activeTheme.frameBackground}
  style:border-color={activeTheme.frameBorder}
  aria-label="Monaco code editor preview"
>
  <div bind:this={container}></div>
</div>

<style>
  .preview-frame {
    width: 100%;
    min-height: 120px;
    border: 1px solid;
    border-radius: 6px;
    overflow: hidden;
    box-sizing: border-box;
  }

  .preview-frame > div {
    width: 100%;
    height: 100%;
  }
</style>
