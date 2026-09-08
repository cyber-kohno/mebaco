type ContentNode = {
  element: unknown
  disabled?: boolean
  children: readonly ContentNode[]
}

type ContentModule = {
  bundle: unknown
  launchers: readonly unknown[]
  apps: readonly ContentNode[]
  common: ContentNode | null
  resources: readonly unknown[]
}

namespace ReleaseContentHash {
  const normalizeNode = (node: ContentNode): unknown => ({
    element: node.element,
    ...(node.disabled === true ? { disabled: true } : {}),
    children: node.children.map(normalizeNode),
  })

  const stableStringify = (value: unknown): string => {
    if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null'
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
    return `{${Object.entries(value)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entryValue]) => `${JSON.stringify(key)}:${stableStringify(entryValue)}`)
      .join(',')}}`
  }

  export const create = async (moduleJson: ContentModule): Promise<string> => {
    const payload = {
      bundle: moduleJson.bundle,
      launchers: moduleJson.launchers,
      apps: moduleJson.apps.map(normalizeNode),
      common: moduleJson.common == null ? null : normalizeNode(moduleJson.common),
      resources: moduleJson.resources,
    }
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(stableStringify(payload)),
    )
    return [...new Uint8Array(digest)]
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')
  }
}

export default ReleaseContentHash
