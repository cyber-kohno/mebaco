<script lang="ts">
  import { onMount, tick } from 'svelte'
  import bodyPortal from '../portal/body-portal'

  type Option = {
    value: string
    label?: string
  }

  type Props = {
    value: string
    options: readonly Option[]
    validationMessage?: string
    validationSeverity?: 'warning' | 'error'
    onValueChange: (value: string) => void
  }

  let {
    value,
    options,
    validationMessage,
    validationSeverity,
    onValueChange,
  }: Props = $props()

  let isOpen = $state(false)
  let focusedIndex = $state(0)
  let inputElement: HTMLInputElement | null = null
  let popupElement = $state<HTMLDivElement | null>(null)
  let popupLeft = $state(0)
  let popupTop = $state(0)
  let popupWidth = $state(220)
  let popupMaxHeight = $state(150)

  const viewportMargin = 8
  const popupGap = 4
  const preferredWidth = 220
  const preferredMaxHeight = 150
  const popupFrameHeight = 10
  const optionHeight = 28

  const filteredOptions = $derived(
    options
      .filter((option) => option.value.toLowerCase().includes(value.toLowerCase()))
      .slice(0, 8),
  )

  const updatePopupPosition = () => {
    if (!isOpen || inputElement == null) return

    const rect = inputElement.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const desiredHeight = Math.min(
      preferredMaxHeight,
      popupFrameHeight + filteredOptions.length * optionHeight,
    )
    const spaceBelow = viewportHeight - viewportMargin - rect.bottom - popupGap
    const spaceAbove = rect.top - viewportMargin - popupGap
    const opensAbove = spaceBelow < desiredHeight && spaceAbove > spaceBelow
    const availableHeight = Math.max(0, opensAbove ? spaceAbove : spaceBelow)
    const actualHeight = Math.min(desiredHeight, availableHeight)
    const availableWidth = Math.max(0, viewportWidth - viewportMargin * 2)

    popupWidth = Math.min(Math.max(rect.width, preferredWidth), availableWidth)
    popupLeft = Math.min(
      Math.max(rect.left, viewportMargin),
      viewportWidth - viewportMargin - popupWidth,
    )
    popupMaxHeight = Math.min(preferredMaxHeight, availableHeight)
    popupTop = opensAbove
      ? Math.max(viewportMargin, rect.top - popupGap - actualHeight)
      : Math.min(viewportHeight - viewportMargin, rect.bottom + popupGap)
  }

  $effect(() => {
    if (!isOpen || filteredOptions.length === 0) return

    filteredOptions.length
    void tick().then(updatePopupPosition)
  })

  onMount(() => {
    const update = () => updatePopupPosition()
    const handleScroll = (event: Event) => {
      if (
        popupElement != null
        && event.target instanceof Node
        && popupElement.contains(event.target)
      ) return

      isOpen = false
    }
    const resizeObserver = new ResizeObserver(update)
    if (inputElement != null) resizeObserver.observe(inputElement)

    window.addEventListener('resize', update)
    window.addEventListener('scroll', handleScroll, true)

    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', handleScroll, true)
    }
  })

  const commit = (nextValue: string) => {
    onValueChange(nextValue)
    isOpen = false
    focusedIndex = 0
  }

  const handleKeydown = (event: KeyboardEvent) => {
    if (!isOpen && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      isOpen = true
      event.preventDefault()
      return
    }

    if (!isOpen || filteredOptions.length === 0) return

    if (event.key === 'ArrowDown') {
      focusedIndex = Math.min(focusedIndex + 1, filteredOptions.length - 1)
      event.preventDefault()
      return
    }

    if (event.key === 'ArrowUp') {
      focusedIndex = Math.max(focusedIndex - 1, 0)
      event.preventDefault()
      return
    }

    if (event.key === 'Enter') {
      commit(filteredOptions[focusedIndex].value)
      event.preventDefault()
      return
    }

    if (event.key === 'Escape') {
      isOpen = false
      event.preventDefault()
    }
  }
</script>

<div class="suggest-input">
  <input
    bind:this={inputElement}
    type="text"
    value={value}
    aria-invalid={validationMessage == null ? undefined : true}
    data-validation-severity={validationSeverity}
    title={validationMessage}
    oninput={(event) => {
      onValueChange(event.currentTarget.value)
      isOpen = true
      focusedIndex = 0
    }}
    onfocus={() => {
      isOpen = true
    }}
    onblur={() => {
      window.setTimeout(() => {
        isOpen = false
      }, 120)
    }}
    onkeydown={handleKeydown}
  />

  {#if isOpen && filteredOptions.length > 0}
    <div
      bind:this={popupElement}
      class="suggest-list"
      use:bodyPortal
      role="listbox"
      style:left={`${popupLeft}px`}
      style:top={`${popupTop}px`}
      style:width={`${popupWidth}px`}
      style:max-height={`${popupMaxHeight}px`}
    >
      {#each filteredOptions as option, index}
        <button
          class:focused={index === focusedIndex}
          type="button"
          role="option"
          aria-selected={index === focusedIndex}
          onmousedown={(event) => {
            event.preventDefault()
            commit(option.value)
          }}
          onmouseenter={() => {
            focusedIndex = index
          }}
        >
          {option.label ?? option.value}
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .suggest-input {
    width: 100%;
  }

  input {
    width: 100%;
    height: 32px;
    padding: 0 9px;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: #ffffff;
    color: #243f47;
    font: inherit;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
  }

  input:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  .suggest-list {
    position: fixed;
    z-index: 200;
    padding: 4px;
    border: 1px solid rgba(147, 214, 225, 0.72);
    border-radius: 6px;
    background: rgba(23, 67, 76, 0.94);
    box-shadow: 0 12px 28px rgba(14, 44, 50, 0.22);
    overflow: auto;
    box-sizing: border-box;
  }

  button {
    display: block;
    width: 100%;
    height: 28px;
    padding: 0 8px;
    border: 1px solid transparent;
    border-radius: 4px;
    background: transparent;
    color: #f4fbfc;
    font: inherit;
    font-size: 13px;
    font-weight: 700;
    text-align: left;
    cursor: default;
  }

  button.focused {
    border-color: rgba(147, 224, 233, 0.82);
    background: rgba(54, 139, 151, 0.72);
  }
</style>
