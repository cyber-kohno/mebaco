<script lang="ts">
  import type State from '@system/model/variable/state'
  import VariableDefinition from '@system/model/variable/variable-definition'
  import TreeStore from '@system/workspace/tree/state'
  import TypeCatalog from '@system/model/type-system/type-catalog'

  type Props = {
    element: State.Element
  }

  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode

  const typeText = $derived(VariableDefinition.getTypeText(
    element,
    (typeId) => TypeCatalog.resolveTypeName($rootNodeStore, typeId),
  ))
  const initialText = $derived.by(() => {
    const source = element.initial.type === 'default'
      ? 'default'
      : element.initial.type === 'literal'
        ? element.initial.value
        : element.initial.source
    const singleLine = source.replace(/\s*\r?\n\s*/g, ' ')
    return singleLine.length > 36
      ? `${singleLine.slice(0, 36)}...`
      : singleLine
  })
</script>

<span class="state-label">
  <span class="state-kind">State</span>
  <span class="state-value">
    <span class="state-prefix">$state.</span><span class="state-name">{element.id}</span><span class="state-separator">:&nbsp;</span><span class="state-type">{typeText}</span><span class="state-separator">&nbsp;=&nbsp;</span><span
      class="state-initial"
      class:default-initial={element.initial.type === 'default'}
      class:literal-initial={element.initial.type === 'literal'}
      class:formula-initial={element.initial.type === 'formula'}
    >{initialText}</span>
  </span>
</span>

<style>
  .state-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.86;
  }

  .state-kind,
  .state-value {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .state-kind {
    padding: 0 10px;
    border-radius: 4px 0 0 4px;
    background: #eadfcf;
    color: #27484f;
  }

  .state-value {
    min-width: 130px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
  }

  .state-prefix,
  .state-separator {
    color: rgba(255, 255, 255, 0.8);
  }

  .state-name {
    color: #cce879;
  }

  .state-type {
    color: #ffe184;
  }

  .state-initial {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .state-initial.literal-initial {
    color: #ffffff;
  }

  .state-initial.formula-initial {
    color: #a8e8eb;
  }

  .state-initial.default-initial {
    color: rgba(255, 255, 255, 0.55);
  }
</style>
