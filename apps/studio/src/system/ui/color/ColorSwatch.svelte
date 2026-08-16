<script lang="ts">
  type Props = {
    value: string
    onValueChange?: (value: string) => void
  }

  let { value, onValueChange }: Props = $props()

  let colorContext: CanvasRenderingContext2D | null = null

  const toHexByte = (value: number): string => (
    Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, '0')
  )

  const toPickerValue = (source: string): string => {
    if (source.length === 0 || typeof document === 'undefined') return '#000000'

    colorContext ??= document.createElement('canvas').getContext('2d')
    if (colorContext == null) return '#000000'

    colorContext.fillStyle = '#000000'
    colorContext.fillStyle = source
    const normalized = colorContext.fillStyle

    const hexMatch = /^#([0-9a-f]{6})$/i.exec(normalized)
    if (hexMatch != null) return `#${hexMatch[1].toLowerCase()}`

    const shortHexMatch = /^#([0-9a-f]{3})$/i.exec(normalized)
    if (shortHexMatch != null) {
      const [red, green, blue] = shortHexMatch[1]
      return `#${red}${red}${green}${green}${blue}${blue}`.toLowerCase()
    }

    const rgbMatch = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i.exec(normalized)
    return rgbMatch == null
      ? '#000000'
      : `#${toHexByte(Number(rgbMatch[1]))}${toHexByte(Number(rgbMatch[2]))}${toHexByte(Number(rgbMatch[3]))}`
  }

  const pickerValue = $derived(toPickerValue(value))
</script>

<span
  class="color-swatch"
  class:interactive={onValueChange != null}
  title={onValueChange == null ? `Color preview: ${value}` : `Choose color: ${value}`}
>
  <span class="color-value" style:background-color={value}></span>
  {#if onValueChange != null}
    <input
      type="color"
      value={pickerValue}
      aria-label="Choose color"
      oninput={(event) => onValueChange?.(event.currentTarget.value)}
    />
  {/if}
</span>

<style>
  .color-swatch {
    position: relative;
    display: block;
    width: 28px;
    height: 28px;
    padding: 3px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background-color: #ffffff;
    background-image:
      linear-gradient(45deg, #dce8eb 25%, transparent 25%),
      linear-gradient(-45deg, #dce8eb 25%, transparent 25%),
      linear-gradient(45deg, transparent 75%, #dce8eb 75%),
      linear-gradient(-45deg, transparent 75%, #dce8eb 75%);
    background-position: 0 0, 0 5px, 5px -5px, -5px 0;
    background-size: 10px 10px;
    box-sizing: border-box;
  }

  .color-swatch.interactive:hover,
  .color-swatch:focus-within {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  .color-value {
    display: block;
    width: 100%;
    height: 100%;
    border-radius: 3px;
  }

  input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    border: 0;
    opacity: 0;
    cursor: default;
  }
</style>
