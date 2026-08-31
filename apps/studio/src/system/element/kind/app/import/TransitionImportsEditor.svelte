<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down'
  import ArrowUp from '@lucide/svelte/icons/arrow-up'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import IconButton from '../../../../ui/button/IconButton.svelte'
  import type ElementEditSchema from '../../../../element-dialog/element-edit-schema'

  type Props = {
    value: string
    options: readonly ElementEditSchema.SelectOption[]
    onValueChange: (value: string) => void
  }

  let { value, options, onValueChange }: Props = $props()
  let appIds = $state<string[]>([])
  let lastValue = $state('')

  const parse = (source: string): string[] => {
    try {
      const parsed: unknown = JSON.parse(source)
      return Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : []
    } catch {
      return []
    }
  }

  const emit = () => {
    lastValue = JSON.stringify(appIds)
    onValueChange(lastValue)
  }

  $effect(() => {
    if (value === lastValue) return
    appIds = parse(value)
    lastValue = value
  })

  const add = () => {
    const available = options.find((option) => !appIds.includes(option.value))
    if (available == null) return
    appIds = [...appIds, available.value]
    emit()
  }

  const update = (index: number, appId: string) => {
    appIds = appIds.map((current, currentIndex) => currentIndex === index ? appId : current)
    emit()
  }

  const remove = (index: number) => {
    appIds = appIds.filter((_, currentIndex) => currentIndex !== index)
    emit()
  }

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset
    if (target < 0 || target >= appIds.length) return
    const next = [...appIds]
    ;[next[index], next[target]] = [next[target], next[index]]
    appIds = next
    emit()
  }
</script>

<section class="transition-imports" aria-label="Imported transition Apps">
  <div class="header">
    <span>Only selected Apps are available from $transition.</span>
    <button type="button" disabled={appIds.length >= options.length} onclick={add}>Add</button>
  </div>

  {#if appIds.length === 0}
    <div class="empty">No transition Apps</div>
  {:else}
    <div class="list">
      {#each appIds as appId, index (`${appId}-${index}`)}
        <div class="row">
          <select value={appId} onchange={(event) => update(index, event.currentTarget.value)}>
            {#if !options.some((option) => option.value === appId)}
              <option value={appId}>Missing App ({appId})</option>
            {/if}
            {#each options as option}
              {#if option.value === appId || !appIds.includes(option.value)}
                <option value={option.value}>{option.label ?? option.value}</option>
              {/if}
            {/each}
          </select>
          <div class="actions">
            <IconButton label="Move App up" disabled={index === 0} onclick={() => move(index, -1)}>
              {#snippet icon()}<ArrowUp size={15} strokeWidth={2} />{/snippet}
            </IconButton>
            <IconButton label="Move App down" disabled={index === appIds.length - 1} onclick={() => move(index, 1)}>
              {#snippet icon()}<ArrowDown size={15} strokeWidth={2} />{/snippet}
            </IconButton>
            <IconButton label="Delete App" onclick={() => remove(index)}>
              {#snippet icon()}<Trash2 size={15} strokeWidth={2} />{/snippet}
            </IconButton>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .transition-imports { display: grid; grid-template-rows: min-content minmax(0, 1fr); gap: 10px; height: 100%; min-height: 0; }
  .header, .row, .actions { display: flex; align-items: center; }
  .header { justify-content: space-between; gap: 10px; color: #496970; font-size: 12px; font-weight: 700; }
  .header button { height: 28px; padding: 0 10px; border: 1px solid var(--mbc-color-border-strong); border-radius: 6px; background: var(--mbc-color-surface-soft); color: #236f7a; font: inherit; font-size: 12px; font-weight: 700; }
  .header button:disabled { opacity: .4; }
  .empty { padding: 12px; border: 1px solid rgba(154, 203, 212, .68); border-radius: 6px; background: rgba(244, 251, 252, .8); color: #6d8990; font-size: 13px; }
  .list { display: grid; align-content: start; gap: 8px; min-height: 0; overflow: auto; }
  .row { gap: 8px; padding: 8px; border: 1px solid rgba(154, 203, 212, .82); border-radius: 6px; background: rgba(244, 251, 252, .76); }
  .row select { flex: 1; min-width: 0; height: 32px; padding: 0 9px; border: 1px solid #9acbd4; border-radius: 6px; background: white; color: #243f47; font: inherit; font-size: 13px; }
  .actions { gap: 5px; }
</style>
