<script lang="ts">
  import type { Snippet } from 'svelte'

  type Props = {
    label: string
    disabled?: boolean
    pressed?: boolean
    onclick: () => void
    icon: Snippet
  }

  let {
    label,
    disabled = false,
    pressed,
    onclick,
    icon,
  }: Props = $props()
</script>

<button
  type="button"
  aria-label={label}
  aria-pressed={pressed}
  title={label}
  {disabled}
  class:pressed={pressed === true}
  {onclick}
>
  {@render icon()}
</button>

<style>
  button {
    display: inline-flex;
    flex: 0 0 28px;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: var(--mbc-color-surface-soft);
    color: #236f7a;
    cursor: default;
  }

  button:disabled {
    opacity: 0.4;
  }

  button:not(:disabled):hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
  }

  button:focus-visible {
    outline: none;
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  button.pressed {
    border-color: #55b7c5;
    background: #cceff4;
    color: #174d59;
  }
</style>
