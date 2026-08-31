namespace ReferenceLanguage {
  export type Kind =
    | 'app'
    | 'component'
    | 'function'
    | 'function-parameter'
    | 'launch-argument'
    | 'object-type'
    | 'signature-type'
    | 'slot'
    | 'state'
    | 'style'
    | 'style-param'
    | 'union-type'
    | 'value-prop'
    | 'variable'

  export const structuralFields: Readonly<Record<string, readonly Kind[]>> = {
    appId: ['app'],
    appIds: ['app'],
    componentId: ['component'],
    functionId: ['function'],
    propId: ['launch-argument', 'value-prop'],
    slotId: ['slot'],
    styleId: ['style'],
    parameterId: ['style-param'],
    namedTypeId: ['object-type', 'union-type', 'signature-type'],
    unionTypeId: ['union-type'],
    signatureTypeId: ['signature-type'],
    baseObjectId: ['object-type'],
    baseObjectIds: ['object-type'],
    objectTypeId: ['object-type'],
    objectTypeIds: ['object-type'],
  }

  export const expressionRoots: Readonly<Record<string, readonly Kind[]>> = {
    $args: ['function-parameter'],
    $fn: ['function'],
    $launch: ['launch-argument'],
    $local: ['variable'],
    $param: ['style-param'],
    $props: ['value-prop'],
    $state: ['state'],
    $transition: ['app'],
    $type: ['object-type', 'union-type', 'signature-type'],
    $var: ['variable'],
  }

  export const isExpressionRoot = (value: string): boolean => (
    expressionRoots[value] != null
  )
}

export default ReferenceLanguage
