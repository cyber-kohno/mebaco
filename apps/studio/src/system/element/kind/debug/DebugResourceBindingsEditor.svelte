<script lang="ts">
  import type ElementEditSchema from '../../../element-dialog/element-edit-schema'

  type Props = {
    value: string
    resources: readonly ElementEditSchema.ResourceBindingResource[]
    onValueChange: (value: string) => void
  }

  let { value, resources, onValueChange }: Props = $props()
  let paths = $state<Record<string, string>>({})
  let lastValue = $state('')

  const parse = (source: string): Record<string, string> => {
    try {
      const parsed: unknown = JSON.parse(source)
      if (!Array.isArray(parsed)) return {}
      return Object.fromEntries(parsed.flatMap((entry) => (
        typeof entry === 'object'
        && entry != null
        && typeof (entry as { resourceId?: unknown }).resourceId === 'string'
        && typeof (entry as { path?: unknown }).path === 'string'
          ? [[
              (entry as { resourceId: string }).resourceId,
              (entry as { path: string }).path,
            ]]
          : []
      )))
    } catch {
      return {}
    }
  }

  const serialize = (): string => JSON.stringify(resources.map((resource) => ({
    resourceId: resource.resourceId,
    path: paths[resource.resourceId] ?? '',
  })))

  $effect(() => {
    if (value === lastValue) return
    paths = parse(value)
    lastValue = value
  })

  const update = (resourceId: string, path: string) => {
    paths = { ...paths, [resourceId]: path }
    lastValue = serialize()
    onValueChange(lastValue)
  }
</script>

<section class="resource-bindings" aria-label="Debug resource paths">
  {#if resources.length === 0}
    <div class="empty">No resources are defined.</div>
  {:else}
    <div class="header" aria-hidden="true">
      <span>Resource</span>
      <span>Kind</span>
      <span>Path</span>
    </div>
    <div class="list">
      {#each resources as resource (resource.resourceId)}
        <label class="row">
          <span class="resource-id">{resource.label}</span>
          <span class="resource-kind">{resource.kindLabel}</span>
          <input
            type="text"
            value={paths[resource.resourceId] ?? ''}
            placeholder="Not specified"
            autocomplete="off"
            spellcheck="false"
            oninput={(event) => update(resource.resourceId, event.currentTarget.value)}
          />
        </label>
      {/each}
    </div>
  {/if}
</section>

<style>
  .resource-bindings {
    display: grid;
    grid-template-rows: min-content minmax(0, 1fr);
    min-height: 0;
    overflow: hidden;
  }

  .header,
  .row {
    display: grid;
    grid-template-columns: minmax(140px, 0.8fr) 110px minmax(260px, 2fr);
    gap: 10px;
    align-items: center;
  }

  .header {
    padding: 0 10px 7px;
    color: #496970;
    font-size: 12px;
    font-weight: 700;
  }

  .list {
    display: grid;
    align-content: start;
    gap: 8px;
    min-height: 0;
    overflow: auto;
  }

  .row {
    padding: 8px 10px;
    border: 1px solid rgba(154, 203, 212, .82);
    border-radius: 6px;
    background: rgba(244, 251, 252, .76);
  }

  .resource-id,
  .resource-kind {
    min-width: 0;
    overflow: hidden;
    color: #2b4850;
    font-size: 13px;
    font-weight: 700;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .resource-kind {
    color: #6d8990;
    font-weight: 600;
  }

  input {
    min-width: 0;
    height: 32px;
    padding: 0 9px;
    border: 1px solid #9acbd4;
    border-radius: 6px;
    background: white;
    color: #243f47;
    font: inherit;
    font-size: 13px;
  }

  input:focus {
    border-color: var(--mbc-color-primary);
    outline: none;
    box-shadow: 0 0 0 2px var(--mbc-color-primary-soft);
  }

  .empty {
    padding: 12px;
    border: 1px solid rgba(154, 203, 212, .68);
    border-radius: 6px;
    background: rgba(244, 251, 252, .8);
    color: #6d8990;
    font-size: 13px;
  }
</style>
