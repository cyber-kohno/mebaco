namespace ElementExpressionFields {
  export const referenceJson = new Set([
    'argumentBindings',
    'attributes',
    'condition',
    'definition',
    'initial',
    'propBindings',
    'properties',
    'refKey',
    'rules',
    'source',
    'styles',
    'valueType',
  ])

  export const direct = new Set([
    'collectionSource',
    'countSource',
    'condition',
    'initial',
    'source',
  ])

  export const verificationJson = new Set([
    'argumentBindings',
    'attributes',
    'condition',
    'definition',
    'initial',
    'propBindings',
    'properties',
    'refKey',
    'rules',
    'source',
    'styles',
  ])

  export const verification = new Set([
    ...direct,
    'argumentBindings',
    'attributes',
    'propBindings',
    'refKey',
    'rules',
    'styles',
  ])
}

export default ElementExpressionFields
