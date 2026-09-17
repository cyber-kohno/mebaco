<script lang="ts">
  import ArrowDown from '@lucide/svelte/icons/arrow-down'
  import ArrowUp from '@lucide/svelte/icons/arrow-up'
  import Trash2 from '@lucide/svelte/icons/trash-2'
  import IconButton from '../../../../ui/button/IconButton.svelte'
  import FormulaLabelField from '../../../../ui/formula/FormulaLabelField.svelte'
  import type EffectElement from './effect-element'

  type Props = {
    value: string
    injectionSource?: string
    errorMessage?: string | null
    onValueChange: (value: string) => void
  }

  let { value, injectionSource, errorMessage, onValueChange }: Props = $props()
  let dependencies = $state<EffectElement.Dependency[]>([])
  let lastValue = $state('')

  const parse = (source: string): EffectElement.Dependency[] => {
    try {
      const parsed: unknown = JSON.parse(source)
      if (!Array.isArray(parsed)) return []
      return parsed.flatMap((item) => {
        if (item == null || typeof item !== 'object') return []
        const dependency = item as Partial<EffectElement.Dependency>
        if (
          typeof dependency.dependencyId !== 'string'
          || dependency.type !== 'formula'
          || typeof dependency.source !== 'string'
        ) return []
        return [{
          dependencyId: dependency.dependencyId,
          type: 'formula' as const,
          source: dependency.source,
        }]
      })
    } catch {
      return []
    }
  }

  const emit = () => {
    lastValue = JSON.stringify(dependencies)
    onValueChange(lastValue)
  }

  $effect(() => {
    if (value === lastValue) return
    dependencies = parse(value)
    lastValue = value
  })

  const add = () => {
    dependencies = [...dependencies, {
      dependencyId: crypto.randomUUID(),
      type: 'formula',
      source: '',
    }]
    emit()
  }

  const update = (index: number, source: string) => {
    dependencies = dependencies.map((dependency, current) => (
      current === index ? { ...dependency, source } : dependency
    ))
    emit()
  }

  const remove = (index: number) => {
    dependencies = dependencies.filter((_, current) => current !== index)
    emit()
  }

  const move = (index: number, offset: -1 | 1) => {
    const target = index + offset
    if (target < 0 || target >= dependencies.length) return
    const next = [...dependencies]
    ;[next[index], next[target]] = [next[target], next[index]]
    dependencies = next
    emit()
  }
</script>

<section class="dependencies" aria-label="Effect dependencies">
  <div class="toolbar">
    <span class="hint">The Effect runs after mount and whenever a value changes.</span>
    <button type="button" onclick={add}>Add</button>
  </div>
  {#if dependencies.length === 0}
    <div class="empty">Add at least one dependency.</div>
  {:else}
    <div class="dependency-list">
      {#each dependencies as dependency, index (dependency.dependencyId)}
        <div class="dependency-row">
          <span class="index">{index + 1}</span>
          <FormulaLabelField
            value={dependency.source}
            ariaLabel={`Dependency ${index + 1} formula`}
            {injectionSource}
            onValueChange={(source) => update(index, source)}
          />
          <div class="actions">
            <IconButton label="Move dependency up" disabled={index === 0} onclick={() => move(index, -1)}>
              {#snippet icon()}<ArrowUp size={15} strokeWidth={2} />{/snippet}
            </IconButton>
            <IconButton label="Move dependency down" disabled={index === dependencies.length - 1} onclick={() => move(index, 1)}>
              {#snippet icon()}<ArrowDown size={15} strokeWidth={2} />{/snippet}
            </IconButton>
            <IconButton label="Delete dependency" onclick={() => remove(index)}>
              {#snippet icon()}<Trash2 size={15} strokeWidth={2} />{/snippet}
            </IconButton>
          </div>
        </div>
      {/each}
    </div>
  {/if}
  {#if errorMessage != null}<div class="error">{errorMessage}</div>{/if}
</section>

<style>
  .dependencies { display: grid; gap: 10px; min-height: 0; }
  .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  .hint { color: #6d8990; font-size: 12px; }
  button { height: 28px; padding: 0 12px; border: 1px solid var(--mbc-color-border-strong); border-radius: 6px; background: var(--mbc-color-surface-soft); color: #236f7a; font: inherit; font-size: 12px; font-weight: 700; }
  .empty { height: 180px; padding: 12px; border: 1px solid rgba(154, 203, 212, 0.68); border-radius: 6px; background: rgba(244, 251, 252, 0.8); color: #6d8990; font-size: 13px; box-sizing: border-box; }
  .dependency-list { display: grid; align-content: start; gap: 8px; height: 260px; padding-right: 4px; overflow: auto; }
  .dependency-row { display: grid; grid-template-columns: 28px minmax(0, 1fr) max-content; gap: 8px; align-items: center; padding: 9px; border: 1px solid rgba(154, 203, 212, 0.72); border-radius: 7px; background: rgba(244, 251, 252, 0.72); }
  .index { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #d8f0ec; color: #315d65; font-size: 12px; font-weight: 800; }
  .actions { display: flex; gap: var(--mbc-form-action-gap); }
  .error { color: #b8454f; font-size: 12px; font-weight: 700; }
</style>
