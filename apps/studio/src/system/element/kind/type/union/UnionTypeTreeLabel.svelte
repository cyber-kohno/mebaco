<script lang="ts">
  import type UnionTypeElement from './union-type-element'
  import TreeStore from '../../../../store/tree-store'
  import TypeCatalog from '../type-catalog'

  type Props = {
    element: UnionTypeElement.Element
  }

  let { element }: Props = $props()

  const rootNodeStore = TreeStore.rootNode

  const kindText = $derived(element.definition.type === 'literal'
    ? `Literal ${element.definition.valueType}`
    : 'Object')

  const valueText = $derived(element.definition.type === 'literal'
    ? element.definition.values
      .map((value) => (typeof value === 'string' ? `'${value}'` : String(value)))
      .join(' | ')
    : element.definition.objectTypeIds
      .map((objectTypeId) => TypeCatalog.findObject($rootNodeStore, objectTypeId)?.element.id ?? 'MissingObject')
      .join(' | '))
</script>

<span class="union-label">
  <span class="union-kind">Union</span>
  <span class="union-value">
    <span class="union-name">{element.id}</span>
    <span class="union-type">{kindText}</span>
    <span class="union-equals"> = </span>
    <span class="union-members">{valueText}</span>
  </span>
</span>

<style>
  .union-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.86;
  }

  .union-kind,
  .union-value {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .union-kind {
    padding: 0 10px;
    border-radius: 4px 0 0 4px;
    background: #e1b5cc;
    color: #27484f;
  }

  .union-value {
    min-width: 130px;
    gap: 7px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
    color: #f4fbfc;
  }

  .union-name {
    color: #cce879;
  }

  .union-type {
    color: #ffe184;
  }

  .union-equals {
    color: rgba(255, 255, 255, 0.8);
  }

  .union-members {
    color: #f4fbfc;
    font-style: italic;
  }
</style>
