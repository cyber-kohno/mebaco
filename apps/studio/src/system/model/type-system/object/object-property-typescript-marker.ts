import type TypeScript from 'typescript'

namespace ObjectPropertyTypeScriptMarker {
  const prefix = '/*__mebaco_object_property_id:'
  const suffix = '__*/'
  const pattern = /\/\*__mebaco_object_property_id:([^*]+)__\*\//g

  export const create = (propertyId: string): string => (
    `${prefix}${encodeURIComponent(propertyId)}${suffix}`
  )

  export const read = (
    declaration: TypeScript.Declaration,
    sourceFile: TypeScript.SourceFile,
  ): string | null => {
    const name: TypeScript.Node = (
      declaration as TypeScript.NamedDeclaration
    ).name ?? declaration
    const leadingText = sourceFile.text.slice(
      declaration.getFullStart(),
      name.getStart(sourceFile),
    )
    const matches = [...leadingText.matchAll(pattern)]
    const encoded = matches.at(-1)?.[1]
    if (encoded == null) return null
    try {
      return decodeURIComponent(encoded)
    } catch {
      return null
    }
  }
}

export default ObjectPropertyTypeScriptMarker
