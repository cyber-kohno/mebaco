<script lang="ts">
  import { onMount, tick } from 'svelte'

  type Props = {
    value: string
    caret: number
    ariaLabel: string
    placeholder?: string
    variant?: 'inline' | 'field'
    onCaretChange: (caret: number) => void
  }

  let {
    value,
    caret,
    ariaLabel,
    placeholder = '',
    variant = 'inline',
    onCaretChange,
  }: Props = $props()
  let editorElement = $state<HTMLDivElement | undefined>(undefined)
  let caretElement = $state<HTMLSpanElement | undefined>(undefined)
  let characters = $derived(value.split(''))
  let normalizedCaret = $derived(Math.max(0, Math.min(value.length, caret)))

  $effect(() => {
    normalizedCaret
    value
    void tick().then(() => {
      const editor = editorElement
      const caretNode = caretElement
      if (editor == null || caretNode == null) return
      const editorRect = editor.getBoundingClientRect()
      const caretRect = caretNode.getBoundingClientRect()
      if (caretRect.left < editorRect.left) editor.scrollLeft -= editorRect.left - caretRect.left
      else if (caretRect.right > editorRect.right) editor.scrollLeft += caretRect.right - editorRect.right
    })
  })

  const handleMousedown = (event: MouseEvent) => {
    event.preventDefault()
    editorElement?.focus({ preventScroll: true })

    const characterElements = editorElement?.querySelectorAll<HTMLElement>('[data-character-index]') ?? []
    let nextCaret = value.length
    for (const characterElement of characterElements) {
      const rect = characterElement.getBoundingClientRect()
      if (event.clientX < rect.left + rect.width / 2) {
        nextCaret = Number(characterElement.dataset.characterIndex)
        break
      }
    }
    onCaretChange(nextCaret)
  }

  onMount(() => {
    editorElement?.focus({ preventScroll: true })
  })
</script>

<div
  class="pseudo-input"
  data-variant={variant}
  bind:this={editorElement}
  role="textbox"
  aria-label={ariaLabel}
  aria-placeholder={placeholder || undefined}
  aria-multiline="false"
  tabindex="0"
  onmousedown={handleMousedown}
>
  {#each characters as character, index}
    {#if normalizedCaret === index}<span class="caret" bind:this={caretElement} aria-hidden="true"></span>{/if}
    <span class="character" data-character-index={index}>{character === ' ' ? '\u00a0' : character}</span>
  {/each}
  {#if normalizedCaret === characters.length}<span class="caret" bind:this={caretElement} aria-hidden="true"></span>{/if}
  {#if characters.length === 0 && placeholder}<span class="placeholder" aria-hidden="true">{placeholder}</span>{/if}
</div>

<style>
  .pseudo-input {
    display: flex;
    align-items: center;
    min-width: 0;
    height: 26px;
    color: #f2ffff;
    font: inherit;
    line-height: 1;
    white-space: pre;
    cursor: text;
    outline: none;
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: none;
  }

  .pseudo-input::-webkit-scrollbar { display: none; }

  .pseudo-input[data-variant='inline'] {
    flex: 1 1 auto;
  }

  .pseudo-input[data-variant='field'] {
    width: calc(100% - 16px);
    height: 28px;
    margin: 0 8px 6px;
    padding: 0 8px;
    border: 1px solid #5ebdca;
    border-radius: 3px;
    background: #102b31;
    box-sizing: border-box;
  }

  .pseudo-input:focus-visible {
    outline: 2px solid #8be5ec;
    outline-offset: 1px;
  }

  .character {
    flex: 0 0 auto;
  }

  .caret {
    flex: 0 0 2px;
    width: 2px;
    height: 1.15em;
    margin-right: -2px;
    background: #f2ffff;
    animation: blink 1s steps(1, end) infinite;
  }

  .placeholder {
    overflow: hidden;
    color: #80aeb4;
    text-overflow: ellipsis;
    white-space: nowrap;
    pointer-events: none;
  }

  @keyframes blink {
    0%, 54% { opacity: 1; }
    55%, 100% { opacity: 0; }
  }

  @media (prefers-reduced-motion: reduce) {
    .caret { animation: none; }
  }
</style>
