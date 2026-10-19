<script lang="ts">
  import Maximize2 from '@lucide/svelte/icons/maximize-2'
  import Check from '@lucide/svelte/icons/check'
  import LoaderCircle from '@lucide/svelte/icons/loader-circle'
  import X from '@lucide/svelte/icons/x'
  import { onMount, tick } from 'svelte'
  import IconButton from '../button/IconButton.svelte'
  import bodyPortal from '../body-portal'
  import MonacoScriptEditor from '../monaco/MonacoScriptEditor.svelte'
  import FormulaEditorDialog from './FormulaEditorDialog.svelte'

  type Props = {
    value: string
    ariaLabel?: string
    injectionSource?: string
    expectedType?: 'string' | 'number' | 'boolean' | 'array'
    expectedTypeText?: string
    allowAwait?: boolean
    validationMessage?: string
    validationSeverity?: 'warning' | 'error'
    presentation?: 'field' | 'label'
    formulaStatus?: 'checking' | 'verified' | 'error'
    formulaDisplayText?: string
    formulaPlaceholder?: boolean
    onEditorActiveChange?: (active: boolean) => void
    onDiagnosticsChange?: (messages: string[] | null) => void
    onValueChange: (value: string) => void
  }

  let {
    value,
    ariaLabel = 'Formula',
    injectionSource,
    expectedType,
    expectedTypeText,
    allowAwait = false,
    validationMessage,
    validationSeverity,
    presentation = 'field',
    formulaStatus = 'checking',
    formulaDisplayText,
    formulaPlaceholder = false,
    onEditorActiveChange,
    onDiagnosticsChange,
    onValueChange,
  }: Props = $props()

  let isOpen = $state(false)
  let isExpanded = $state(false)
  let diagnosticMessages = $state<string[]>([])
  let anchorElement: HTMLDivElement | null = null
  let popupElement = $state<HTMLElement | null>(null)
  let popupLeft = $state(0)
  let popupTop = $state(0)
  let popupWidth = $state(420)
  const instanceId = crypto.randomUUID()
  const openEventName = 'mebaco:formula-popover-open'
  const viewportMargin = 8
  const popupGap = 4
  const preferredWidth = 420

  const effectiveValidationMessage = $derived(
    validationMessage ?? diagnosticMessages[0],
  )

  const updatePopupPosition = () => {
    if (!isOpen || anchorElement == null) return

    const rect = anchorElement.getBoundingClientRect()
    const availableWidth = Math.max(0, window.innerWidth - viewportMargin * 2)
    popupWidth = Math.min(Math.max(rect.width, preferredWidth), availableWidth)
    popupLeft = Math.min(
      Math.max(rect.left, viewportMargin),
      window.innerWidth - viewportMargin - popupWidth,
    )

    const popupHeight = popupElement?.offsetHeight ?? 164
    const spaceBelow = window.innerHeight - viewportMargin - rect.bottom - popupGap
    const spaceAbove = rect.top - viewportMargin - popupGap
    popupTop = spaceBelow < popupHeight && spaceAbove > spaceBelow
      ? Math.max(viewportMargin, rect.top - popupGap - popupHeight)
      : Math.min(window.innerHeight - viewportMargin - popupHeight, rect.bottom + popupGap)
  }

  const openPopover = () => {
    window.dispatchEvent(new CustomEvent(openEventName, { detail: instanceId }))
    isOpen = true
    onEditorActiveChange?.(true)
    void tick().then(updatePopupPosition)
  }

  const closePopover = () => {
    isOpen = false
    onEditorActiveChange?.(false)
  }

  const expand = () => {
    isOpen = false
    isExpanded = true
  }

  const handlePopoverKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return

    closePopover()
    event.preventDefault()
    event.stopPropagation()
  }

  onMount(() => {
    const handleOtherPopover = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instanceId) closePopover()
    }
    const handlePointerDown = (event: PointerEvent) => {
      if (!isOpen || !(event.target instanceof Node)) return
      if (anchorElement?.contains(event.target) || popupElement?.contains(event.target)) return
      closePopover()
    }
    const handleScroll = (event: Event) => {
      if (
        isOpen
        && event.target instanceof Node
        && popupElement?.contains(event.target)
      ) return
      closePopover()
    }
    const resizeObserver = new ResizeObserver(updatePopupPosition)
    if (anchorElement != null) resizeObserver.observe(anchorElement)

    window.addEventListener(openEventName, handleOtherPopover)
    window.addEventListener('resize', updatePopupPosition)
    window.addEventListener('scroll', handleScroll, true)
    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener(openEventName, handleOtherPopover)
      window.removeEventListener('resize', updatePopupPosition)
      window.removeEventListener('scroll', handleScroll, true)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  })
</script>

<div class="compact-formula-field" bind:this={anchorElement}>
  <button
    class="formula-trigger"
    class:empty={value.length === 0}
    type="button"
    aria-label={ariaLabel}
    aria-haspopup="dialog"
    aria-expanded={isOpen}
    class:formula-label={presentation === 'label'}
    data-formula-status={presentation === 'label' ? formulaStatus : undefined}
    data-validation-severity={effectiveValidationMessage == null ? undefined : validationSeverity ?? 'error'}
    title={effectiveValidationMessage ?? (value || 'Set formula')}
    onclick={openPopover}
  >
    {#if presentation === 'label'}
      <span
        class="formula-status {formulaStatus}"
        aria-label={formulaStatus === 'verified'
          ? 'Formula is valid'
          : formulaStatus === 'error'
            ? 'Formula has an error'
            : 'Checking formula'}
      >
        {#if formulaStatus === 'verified'}
          <Check size={15} strokeWidth={3} />
        {:else if formulaStatus === 'error'}
          <X size={15} strokeWidth={3} />
        {:else}
          <LoaderCircle size={15} strokeWidth={2} />
        {/if}
      </span>
    {/if}
    <span class:placeholder={formulaPlaceholder} class="formula-value">
      {formulaDisplayText ?? (value || 'Set formula')}
    </span>
  </button>
</div>

{#if isOpen}
  <div
    bind:this={popupElement}
    class="formula-popover"
    use:bodyPortal
    role="dialog"
    tabindex="-1"
    aria-label={`${ariaLabel} editor`}
    onkeydown={handlePopoverKeyDown}
    style:left={`${popupLeft}px`}
    style:top={`${popupTop}px`}
    style:width={`${popupWidth}px`}
  >
    <header class="formula-popover-header">
      <span>TypeScript Expression</span>
      <div class="formula-popover-actions">
        <IconButton label={`Expand ${ariaLabel} editor`} onclick={expand}>
          {#snippet icon()}<Maximize2 size={15} strokeWidth={2} />{/snippet}
        </IconButton>
        <IconButton label={`Close ${ariaLabel} editor`} onclick={closePopover}>
          {#snippet icon()}<X size={15} strokeWidth={2} />{/snippet}
        </IconButton>
      </div>
    </header>
    <MonacoScriptEditor
      {value}
      mode="expression"
      height="120px"
      {injectionSource}
      {expectedType}
      {expectedTypeText}
      {allowAwait}
      autoFocus
      onDiagnosticsChange={(messages) => {
        diagnosticMessages = messages
        onDiagnosticsChange?.(messages)
      }}
      onValueChange={(nextValue) => {
        diagnosticMessages = []
        onDiagnosticsChange?.(null)
        onValueChange(nextValue)
      }}
    />
  </div>
{/if}

{#if isExpanded}
  <FormulaEditorDialog
    {value}
    {injectionSource}
    {expectedType}
    {expectedTypeText}
    {allowAwait}
    onValueChange={(nextValue) => {
      onDiagnosticsChange?.(null)
      onValueChange(nextValue)
    }}
    onDiagnosticsChange={(messages) => {
      diagnosticMessages = messages
      onDiagnosticsChange?.(messages)
    }}
    onBack={() => {
      isExpanded = false
      openPopover()
    }}
  />
{/if}

<style>
  .compact-formula-field {
    width: 100%;
    min-width: 0;
  }

  .formula-trigger {
    display: block;
    width: 100%;
    height: 32px;
    padding: 0 9px;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    color: #243f47;
    font: inherit;
    font-size: 13px;
    line-height: 30px;
    text-align: left;
    outline: none;
    cursor: default;
    box-sizing: border-box;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .formula-trigger.empty {
    color: #789198;
    font-style: italic;
  }

  .formula-trigger[data-validation-severity='warning']:not(.formula-label) {
    border-color: var(--mbc-color-validation-warning-strong);
    background: var(--mbc-color-validation-warning);
  }

  .formula-trigger[data-validation-severity='error']:not(.formula-label) {
    border-color: var(--mbc-color-validation-error-strong);
    background: var(--mbc-color-validation-error);
  }

  .formula-trigger:hover {
    background: var(--mbc-color-primary-soft);
  }

  .formula-trigger:focus-visible {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  .formula-trigger.formula-label {
    display: flex;
    align-items: center;
    gap: 7px;
    border: 0;
    border-left: 3px solid #d9b77b;
    border-radius: 0;
    background: #fff8ed;
    color: #714b12;
    cursor: pointer;
  }

  .formula-trigger.formula-label:hover {
    background: #fff0d8;
  }

  .formula-trigger.formula-label[data-formula-status='verified'] {
    background: #f2f9e5;
  }

  .formula-trigger.formula-label[data-formula-status='verified']:hover {
    background: #e8f4d2;
  }

  .formula-trigger.formula-label[data-formula-status='error'] {
    background: #fff0f1;
  }

  .formula-trigger.formula-label[data-formula-status='error']:hover {
    background: #ffe3e6;
  }

  .formula-trigger.formula-label.empty {
    font-style: normal;
  }

  .formula-trigger.formula-label .formula-value.placeholder {
    color: #9a7743;
    font-style: italic;
    font-weight: 400;
  }

  .formula-status {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 auto;
    width: 15px;
    height: 15px;
  }

  .formula-status.verified { color: #8ebc2f; }

  .formula-status.error { color: #d04452; }

  .formula-status.checking {
    color: #aa741d;
    animation: formula-status-spin 0.8s linear infinite;
  }

  @keyframes formula-status-spin {
    to { transform: rotate(360deg); }
  }

  @media (prefers-reduced-motion: reduce) {
    .formula-status.checking { animation: none; }
  }

  .formula-label .formula-value {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .formula-popover {
    position: fixed;
    z-index: 900;
    display: grid;
    grid-template-rows: 34px 120px;
    border: 1px solid rgba(132, 198, 210, 0.86);
    border-radius: 7px;
    background: #ffffff;
    box-shadow: 0 14px 34px rgba(18, 55, 64, 0.25);
    overflow: hidden;
    box-sizing: border-box;
  }

  .formula-popover-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 4px 0 10px;
    border-bottom: 1px solid rgba(154, 203, 212, 0.66);
    background: #f4fbfc;
    color: #496970;
    font-size: 12px;
    font-weight: 700;
  }

  .formula-popover-actions {
    display: flex;
    align-items: center;
    gap: 2px;
  }
</style>
