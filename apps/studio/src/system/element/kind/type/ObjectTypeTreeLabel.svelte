<script lang="ts">
  import type ObjectTypeElement from './object-type-element'
  import TreeStore from '../../../store/tree-store'
  import TypeCatalog from './type-catalog'
  import TypeExpression from './type-expression'

  type Props = {
    element: ObjectTypeElement.Element
  }

  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode

  const countProperties = (
    properties: readonly TypeExpression.Property[],
  ): number => properties.reduce((count, property) => {
    const { base } = TypeExpression.unwrapArray(property.valueType)
    return count + 1 + (base.type === 'object' ? countProperties(base.properties) : 0)
  }, 0)

  const countObjectProperties = (
    object: ObjectTypeElement.Element,
    visited = new Set<string>(),
  ): number => {
    if (visited.has(object.typeId)) return 0
    const nextVisited = new Set([...visited, object.typeId])
    const inheritedCount = object.baseObjectIds.reduce((count, baseObjectId) => {
      const base = TypeCatalog.findObject($rootNodeStore, baseObjectId)?.element
      return count + (base == null ? 0 : countObjectProperties(base, nextVisited))
    }, 0)

    return inheritedCount + countProperties(object.properties)
  }

  const propertyCount = $derived(countObjectProperties(element))
</script>

<span class="object-label">
  <span class="object-kind">Object</span>
  <span class="object-value">
    <span class="object-name">{element.id}</span>
    <span class="object-summary">properties {'{'} {propertyCount} {'}'}</span>
  </span>
</span>

<style>
  .object-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.86;
  }

  .object-kind,
  .object-value {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .object-kind {
    padding: 0 10px;
    border-radius: 4px 0 0 4px;
    background: #e1b5cc;
    color: #27484f;
  }

  .object-value {
    min-width: 130px;
    gap: 7px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
    color: #f4fbfc;
  }

  .object-name {
    color: #cce879;
  }

  .object-summary {
    color: #f4fbfc;
  }
</style>
