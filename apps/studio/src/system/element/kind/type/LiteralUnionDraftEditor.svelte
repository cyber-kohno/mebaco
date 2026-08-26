<script lang="ts">
  import { Plus } from '@lucide/svelte'
  import LiteralUnion from './literal-union'
  import TypeLiteralLabel from './type-literal-label'

  type LiteralValueType = 'string' | 'number'
  type Literal = string | number

  type Props = {
    valueType: LiteralValueType
    values: readonly Literal[]
    label?: string
    onAdd: (value: Literal) => void
    onRemove: (index: number) => void
  }

  let {
    valueType,
    values,
    label,
    onAdd,
    onRemove,
  }: Props = $props()

  let draft = $state('')

  $effect(() => {
    valueType
    values
    draft = ''
  })

  const getDraftError = (): string | null => {
    if (valueType === 'string') {
      return LiteralUnion.validateTextDraft(
        draft,
        values.filter((value): value is string => typeof value === 'string'),
      )
    }

    if (draft.trim().length === 0) return 'Literal must be 1 character or more.'
    const value = Number(draft)
    if (!Number.isFinite(value)) return 'Literal must be a valid number.'
    return values.includes(value) ? 'Literal is duplicated.' : null
  }

  const draftEmpty = $derived(
    valueType === 'number' ? draft.trim().length === 0 : draft.length === 0,
  )
  const draftError = $derived(draftEmpty ? null : getDraftError())
  const canAdd = $derived(!draftEmpty && draftError == null)

  const addLiteral = () => {
    if (!canAdd) return
    onAdd(valueType === 'number' ? Number(draft) : draft)
    draft = ''
  }
</script>

<div class="literal-draft-editor" class:labeled={label != null}>
  {#if label != null}
    <span class="detail-label">{label}</span>
  {/if}

  <div class="literal-content">
    <div class="input-row">
      <input
        type={valueType === 'number' ? 'number' : 'text'}
        value={draft}
        aria-label="Literal Value"
        aria-invalid={draftError == null ? undefined : true}
        title={draftError ?? undefined}
        oninput={(event) => {
          draft = event.currentTarget.value
        }}
        onkeydown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          addLiteral()
        }}
      />
      <button
        class="icon-button"
        type="button"
        title="Add Literal"
        aria-label="Add Literal"
        disabled={!canAdd}
        onclick={addLiteral}
      >
        <Plus size={16} />
      </button>
    </div>

    {#if draftError != null}
      <div class="draft-error">{draftError}</div>
    {/if}

    <div class="chip-list">
      {#each values as literal, index}
        <span class="chip">
          <span>{TypeLiteralLabel.format(literal)}</span>
          <button
            type="button"
            title="Remove Literal"
            aria-label={`Remove Literal ${TypeLiteralLabel.format(literal)}`}
            onclick={() => onRemove(index)}
          >x</button>
        </span>
      {/each}
    </div>
  </div>
</div>

<style>
  .literal-draft-editor {
    display: grid;
    gap: 7px;
    min-width: 0;
  }

  .literal-draft-editor.labeled {
    grid-template-columns: 110px minmax(0, 1fr);
    align-items: start;
    gap: 10px;
  }

  .detail-label {
    padding-top: 8px;
    font-weight: 700;
  }

  .literal-content {
    display: grid;
    gap: 7px;
    min-width: 0;
  }

  .input-row {
    display: grid;
    grid-template-columns: minmax(0, var(--mbc-width-literal-union-field)) 32px;
    gap: 4px;
  }

  input {
    min-width: 0;
    width: min(100%, var(--mbc-width-id-field));
    height: 32px;
    padding: 0 10px;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: #fff;
    color: #2b4850;
    font: inherit;
  }

  input:focus {
    border-color: var(--mbc-color-primary);
    box-shadow: 0 0 0 3px rgba(78, 195, 211, 0.22);
  }

  .draft-error {
    color: var(--mbc-color-validation-error-strong);
    font-size: 12px;
    font-weight: 700;
  }

  .chip-list {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    max-height: 180px;
    overflow: auto;
  }

  .chip {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    border: 1px solid #9acbd4;
    border-radius: 5px;
    background: #eef8fa;
    color: #6f551c;
    font-weight: 700;
  }

  .chip > span {
    padding: 0 8px;
  }

  .chip button {
    width: 26px;
    height: 26px;
    min-width: 0;
    padding: 0;
    border: 0;
    border-left: 1px solid #b8d9df;
    border-radius: 0;
    background: transparent;
    color: #ad4c5a;
    font: inherit;
    font-size: 15px;
  }

  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    min-width: 0;
    height: 32px;
    padding: 0;
    border: 1px solid var(--mbc-color-border-strong);
    border-radius: 6px;
    background: var(--mbc-color-surface-soft);
    color: #236f7a;
    font: inherit;
    font-weight: 700;
  }

  .icon-button:hover {
    border-color: var(--mbc-color-primary);
    background: var(--mbc-color-primary-soft);
  }

  .icon-button:disabled {
    opacity: 0.42;
  }
</style>
