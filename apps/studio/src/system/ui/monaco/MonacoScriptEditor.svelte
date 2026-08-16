<script lang="ts">
  import { onDestroy, onMount, tick } from 'svelte'
  import type * as Monaco from 'monaco-editor'
  import MonacoDiagnostics from './monaco-diagnostics'
  import MonacoFactory from './monaco-factory'
  import MonacoInjection from './monaco-injection'
  import MonacoOverflowLayer from './monaco-overflow-layer'

  type Props = {
    value: string
    mode: MonacoInjection.Mode
    onValueChange: (value: string) => void
    height?: string
    injectionSource?: string
    expectedType?: MonacoInjection.ExpectedType
    expectedTypeText?: string
    onDiagnosticsChange?: (messages: string[]) => void
  }

  let {
    value,
    mode,
    onValueChange,
    height = '150px',
    injectionSource,
    expectedType,
    expectedTypeText,
    onDiagnosticsChange,
  }: Props = $props()

  let container: HTMLDivElement | null = null
  let editor: Monaco.editor.IStandaloneCodeEditor | null = null
  let monaco: typeof Monaco | null = null
  let userModel: Monaco.editor.ITextModel | null = null
  let analysisModel: Monaco.editor.ITextModel | null = null
  let injectionModel: Monaco.editor.ITextModel | null = null
  let lastEditorValue = ''
  let diagnosticsTimer: number | null = null
  let layoutFrame: number | null = null
  let resizeObserver: ResizeObserver | null = null
  let overflowLayer: MonacoOverflowLayer.Layer | null = null
  let destroyed = false
  const scheduledTimers = new Set<number>()

  const uid = crypto.randomUUID()

  const getInjectionSource = () => (
    injectionSource ?? MonacoInjection.createDefaultInjectionSource(mode)
  )

  const getAnalysisOptions = (): MonacoInjection.AnalysisOptions => ({
    injectionSource: getInjectionSource(),
    scopeId: uid,
    expectedType,
    expectedTypeText,
  })

  const getAnalysisSource = (
    code: string,
  ): string => MonacoInjection.wrapForAnalysis(code, mode, getAnalysisOptions())

  const setExternalValue = (
    nextValue: string,
  ) => {
    if (userModel == null || nextValue === lastEditorValue) return

    lastEditorValue = nextValue
    userModel.setValue(nextValue)
    analysisModel?.setValue(getAnalysisSource(nextValue))
  }

  const setInjectionSource = (
    nextValue: string,
  ) => {
    if (injectionModel == null || injectionModel.getValue() === nextValue) return
    injectionModel.setValue(nextValue)
    analysisModel?.setValue(getAnalysisSource(lastEditorValue))
    scheduleDiagnostics()
  }

  const scheduleTimer = (
    callback: () => void,
    delay: number,
  ) => {
    const timer = window.setTimeout(() => {
      scheduledTimers.delete(timer)
      if (!destroyed) callback()
    }, delay)
    scheduledTimers.add(timer)
  }

  const scheduleDiagnostics = () => {
    if (diagnosticsTimer != null) {
      window.clearTimeout(diagnosticsTimer)
    }

    diagnosticsTimer = window.setTimeout(() => {
      void runDiagnostics()
    }, 120)
  }

  const scheduleInitialDiagnostics = () => {
    ;[0, 150, 500].forEach((delay) => {
      scheduleTimer(() => {
        void runDiagnostics()
      }, delay)
    })
  }

  const runDiagnostics = async () => {
    if (monaco == null || userModel == null || analysisModel == null) return

    const service = await MonacoFactory.getTypeScriptService(monaco, analysisModel.uri) as {
      getSyntacticDiagnostics(uri: string): Promise<unknown[]>
      getSemanticDiagnostics(uri: string): Promise<unknown[]>
      getSuggestionDiagnostics(uri: string): Promise<unknown[]>
    }

    const uri = analysisModel.uri.toString()
    const diagnostics = [
      ...await service.getSyntacticDiagnostics(uri),
      ...await service.getSemanticDiagnostics(uri),
      ...await service.getSuggestionDiagnostics(uri),
    ]

    const markers = MonacoDiagnostics.createMarkers(
      monaco,
      diagnostics as Parameters<typeof MonacoDiagnostics.createMarkers>[1],
      analysisModel,
      mode,
      MonacoInjection.getAnalysisOffsetLine(getAnalysisOptions()),
      userModel.getLineCount(),
    )

    monaco.editor.setModelMarkers(userModel, 'mebaco', markers)
    onDiagnosticsChange?.(
      markers
        .filter((marker) => marker.severity === monaco?.MarkerSeverity.Error)
        .map((marker) => marker.message),
    )
  }

  const scheduleLayout = () => {
    if (layoutFrame != null) {
      window.cancelAnimationFrame(layoutFrame)
    }

    layoutFrame = window.requestAnimationFrame(() => {
      editor?.layout()
      layoutFrame = null
    })
  }

  const scheduleInitialLayout = () => {
    scheduleLayout()

    ;[0, 50, 150, 500].forEach((delay) => {
      scheduleTimer(() => {
        editor?.layout()
        editor?.render(true)
      }, delay)
    })
  }

  $effect(() => {
    setExternalValue(value)
  })

  $effect(() => {
    setInjectionSource(getInjectionSource())
  })

  $effect(() => {
    expectedType
    expectedTypeText
    if (analysisModel == null) return

    analysisModel.setValue(getAnalysisSource(lastEditorValue))
    scheduleDiagnostics()
  })

  onMount(async () => {
    if (container == null) return
    const mountContainer = container

    monaco = await MonacoFactory.createMonaco()
    await tick()

    if (destroyed || container !== mountContainer || !mountContainer.isConnected) {
      return
    }

    monaco.editor.defineTheme('mebaco-light', {
      base: 'vs',
      inherit: true,
      rules: [],
      colors: {
        'editor.background': '#ffffff',
        'editor.foreground': '#243f47',
        'editorLineNumber.foreground': '#89aab1',
        'editorCursor.foreground': '#236f7a',
        'editor.selectionBackground': '#bdeef5',
        'editor.inactiveSelectionBackground': '#d9f4f7',
        'editorWidget.background': '#f4fbfc',
        'editorWidget.border': '#9acbd4',
      },
    })

    const userUri = monaco.Uri.parse(`inmemory://mebaco/user-${uid}.ts`)
    const analysisUri = monaco.Uri.parse(`inmemory://mebaco/analysis-${uid}.ts`)
    const injectionUri = monaco.Uri.parse(`file:///__mebaco__/injection-${uid}.d.ts`)

    userModel = MonacoFactory.createModel(monaco, value, userUri)
    injectionModel = MonacoFactory.createModel(monaco, getInjectionSource(), injectionUri)
    analysisModel = MonacoFactory.createModel(
      monaco,
      getAnalysisSource(value),
      analysisUri,
    )
    lastEditorValue = value
    overflowLayer = MonacoOverflowLayer.create()

    editor = monaco.editor.create(mountContainer, {
      model: userModel,
      language: 'typescript',
      theme: 'mebaco-light',
      automaticLayout: true,
      minimap: {
        enabled: false,
      },
      fontSize: 13,
      lineNumbersMinChars: 3,
      scrollBeyondLastLine: false,
      tabSize: 2,
      wordWrap: 'on',
      fixedOverflowWidgets: true,
      overflowWidgetsDomNode: overflowLayer.element,
    })

    resizeObserver = new ResizeObserver(() => {
      scheduleLayout()
    })
    resizeObserver.observe(container)
    if (container.parentElement != null) {
      resizeObserver.observe(container.parentElement)
    }

    scheduleInitialLayout()

    editor.onDidChangeModelContent(() => {
      if (userModel == null || analysisModel == null) return

      lastEditorValue = userModel.getValue()
      analysisModel.setValue(getAnalysisSource(lastEditorValue))
      onValueChange(lastEditorValue)
      scheduleDiagnostics()
    })

    scheduleInitialDiagnostics()
  })

  onDestroy(() => {
    destroyed = true
    if (diagnosticsTimer != null) {
      window.clearTimeout(diagnosticsTimer)
    }
    if (layoutFrame != null) {
      window.cancelAnimationFrame(layoutFrame)
    }
    scheduledTimers.forEach((timer) => window.clearTimeout(timer))
    scheduledTimers.clear()
    resizeObserver?.disconnect()

    editor?.dispose()
    overflowLayer?.destroy()
    userModel?.dispose()
    analysisModel?.dispose()
    injectionModel?.dispose()
  })
</script>

<div class="monaco-frame" style:height>
  <div bind:this={container}></div>
</div>

<style>
  .monaco-frame {
    width: 100%;
    min-height: 96px;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    overflow: hidden;
    box-sizing: border-box;
  }

  .monaco-frame > div {
    width: 100%;
    height: 100%;
  }

  :global(.mebaco-monaco-overflow-layer) {
    position: fixed;
    z-index: 1100;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    background: transparent !important;
    overflow: visible !important;
    pointer-events: none;
  }

  :global(.mebaco-monaco-overflow-layer > *) {
    pointer-events: auto;
  }
</style>
