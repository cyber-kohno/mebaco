<script lang="ts">
  import TreeStore from '../../../../store/tree-store'
  import TypeCatalog from '../type-catalog'
  import TypeExpression from '../type-expression'
  import ValueTypeDefinition from '../value-type-definition'
  import type SignatureTypeElement from './signature-type-element'

  type Props = {
    element: SignatureTypeElement.Element
  }

  let { element }: Props = $props()
  const rootNodeStore = TreeStore.rootNode

  const resolveTypeName = (typeId: string): string | undefined => (
    TypeCatalog.resolveTypeName($rootNodeStore, typeId)
  )

  const parameterText = $derived(element.parameters.map((parameter) => {
    const valueType = TypeExpression.getTypeText(parameter.valueType, resolveTypeName)
    return `${parameter.id}: ${valueType}${parameter.nullable ? ' | null' : ''}`
  }).join(', '))

  const returnTypeText = $derived.by(() => {
    const valueType = element.returnType == null
      ? 'void'
      : ValueTypeDefinition.getTypeText(element.returnType, resolveTypeName)
    return element.async ? `Promise<${valueType}>` : valueType
  })
</script>

<span class="signature-label">
  <span class="signature-kind">Signature</span>
  <span class="signature-value">
    <span class="signature-name">{element.id}</span>
    <span class="signature-syntax">&nbsp;=&nbsp;({parameterText})&nbsp;=&gt;&nbsp;</span>
    <span class="signature-return">{returnTypeText}</span>
  </span>
</span>

<style>
  .signature-label {
    display: inline-flex;
    align-items: center;
    height: 100%;
    margin-left: 3px;
    color: #2b4850;
    font-size: 15px;
    font-weight: 700;
    opacity: 0.86;
  }

  .signature-kind,
  .signature-value {
    display: inline-flex;
    align-items: center;
    height: 30px;
    border: 1px solid #87bac2;
    line-height: 1;
  }

  .signature-kind {
    padding: 0 10px;
    border-radius: 4px 0 0 4px;
    background: #e1b5cc;
    color: #27484f;
  }

  .signature-value {
    min-width: 82px;
    padding: 0 12px;
    border-left: 0;
    border-radius: 0 4px 4px 0;
    background: #496970;
    color: #f4fbfc;
  }

  .signature-name {
    color: #cce879;
  }

  .signature-syntax {
    color: #f4fbfc;
  }

  .signature-return {
    color: #9fe5ef;
  }
</style>
