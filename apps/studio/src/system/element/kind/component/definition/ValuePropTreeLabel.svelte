<script lang="ts">
  import TreeStore from '../../../../store/tree-store'
import TypeCatalog from '../../type/type-catalog'
import TypeExpression from '../../type/type-expression'
  import type ValuePropElement from './value-prop-element'

  type Props = {
    element: ValuePropElement.Element
  }

  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode

  const typeText = $derived(`${TypeExpression.getTypeText(
    element.valueType,
    (typeId) => TypeCatalog.resolveTypeName($rootNodeStore, typeId),
  )}${element.nullable ? ' | null' : ''}`)
</script>

<span class="prop-label">
  <span class="prop-kind">Prop</span>
  <span class="prop-value">
    <span class="prop-prefix">$props.</span><span class="prop-name">{element.id}</span><span class="prop-separator">{element.defaultValue == null ? ':' : '?:'}&nbsp;</span><span class="prop-type">{typeText}</span>
  </span>
</span>

<style>
  .prop-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.86;
  }

  .prop-kind,
  .prop-value {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .prop-kind {
    padding: 0 10px;
    border-radius: 4px 0 0 4px;
    background: #eadfcf;
    color: #27484f;
  }

  .prop-value {
    min-width: 130px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
  }

  .prop-prefix,
  .prop-separator {
    color: rgba(255, 255, 255, 0.8);
  }

  .prop-name {
    color: #cce879;
  }

  .prop-type {
    color: #ffe184;
  }
</style>
