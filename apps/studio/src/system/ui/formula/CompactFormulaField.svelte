<script lang="ts">
  import Maximize2 from '@lucide/svelte/icons/maximize-2'
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
    validationMessage?: string
    validationSeverity?: 'warning' | 'error'
    onValueChange: (value: string) => void
  }

  let {
    value,
    ariaLabel = 'Formula',
    injectionSource,
    expectedType,
    expectedTypeText,
    validationMessage,
    validationSeverity,
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
    void tick().then(updatePopupPosition)
  }

  const closePopover = () => {
    isOpen = false
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
    data-validation-severity={effectiveValidationMessage == null ? undefined : validationSeverity ?? 'error'}
    title={effectiveValidationMessage ?? (value || 'Set formula')}
    onclick={openPopover}
  >
    <span>{value || 'Set formula'}</span>
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
      autoFocus
      onDiagnosticsChange={(messages) => {
        diagnosticMessages = messages
      }}
      onValueChange={(nextValue) => {
        diagnosticMessages = []
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
    {onValueChange}
    onDiagnosticsChange={(messages) => {
      diagnosticMessages = messages
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

  .formula-trigger[data-validation-severity='warning'] {
    border-color: var(--mbc-color-validation-warning-strong);
    background: var(--mbc-color-validation-warning);
  }

  .formula-trigger[data-validation-severity='error'] {
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
