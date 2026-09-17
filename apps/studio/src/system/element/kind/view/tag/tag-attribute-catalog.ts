import type TagCatalog from './tag-catalog'

namespace TagAttributeCatalog {
  export type ValueType =
    | 'string'
    | 'number'
    | 'boolean'
    | 'enum'
    | 'url'
    | 'token-list'

  export type Definition = {
    name: string
    valueType: ValueType
    values?: readonly string[]
    scope: 'global' | 'tag'
  }

  export type Option = {
    value: string
    label: string
    detail: string
    title: string
  }

  const global = (
    name: string,
    valueType: ValueType = 'string',
    values?: readonly string[],
  ): Definition => ({ name, valueType, values, scope: 'global' })

  const local = (
    name: string,
    valueType: ValueType = 'string',
    values?: readonly string[],
  ): Definition => ({ name, valueType, values, scope: 'tag' })

  const globalDefinitions = [
    global('accesskey'),
    global('aria-activedescendant'),
    global('aria-atomic', 'enum', ['true', 'false']),
    global('aria-autocomplete', 'enum', ['none', 'inline', 'list', 'both']),
    global('aria-busy', 'enum', ['true', 'false']),
    global('aria-checked', 'enum', ['true', 'false', 'mixed']),
    global('aria-colcount', 'number'),
    global('aria-colindex', 'number'),
    global('aria-colspan', 'number'),
    global('aria-label'),
    global('aria-labelledby', 'token-list'),
    global('aria-describedby', 'token-list'),
    global('aria-controls', 'token-list'),
    global('aria-current', 'enum', ['true', 'false', 'page', 'step', 'location', 'date', 'time']),
    global('aria-details'),
    global('aria-disabled', 'enum', ['true', 'false']),
    global('aria-errormessage'),
    global('aria-expanded', 'enum', ['true', 'false']),
    global('aria-flowto', 'token-list'),
    global('aria-haspopup', 'enum', ['true', 'false', 'menu', 'listbox', 'tree', 'grid', 'dialog']),
    global('aria-hidden', 'enum', ['true', 'false']),
    global('aria-invalid', 'enum', ['true', 'false', 'grammar', 'spelling']),
    global('aria-keyshortcuts'),
    global('aria-level', 'number'),
    global('aria-live', 'enum', ['off', 'polite', 'assertive']),
    global('aria-modal', 'enum', ['true', 'false']),
    global('aria-multiline', 'enum', ['true', 'false']),
    global('aria-multiselectable', 'enum', ['true', 'false']),
    global('aria-orientation', 'enum', ['horizontal', 'vertical']),
    global('aria-owns', 'token-list'),
    global('aria-placeholder'),
    global('aria-posinset', 'number'),
    global('aria-pressed', 'enum', ['true', 'false', 'mixed']),
    global('aria-readonly', 'enum', ['true', 'false']),
    global('aria-relevant', 'enum', ['additions', 'removals', 'text', 'all']),
    global('aria-required', 'enum', ['true', 'false']),
    global('aria-roledescription'),
    global('aria-rowcount', 'number'),
    global('aria-rowindex', 'number'),
    global('aria-rowspan', 'number'),
    global('aria-selected', 'enum', ['true', 'false']),
    global('aria-setsize', 'number'),
    global('aria-sort', 'enum', ['none', 'ascending', 'descending', 'other']),
    global('aria-valuemax', 'number'),
    global('aria-valuemin', 'number'),
    global('aria-valuenow', 'number'),
    global('aria-valuetext'),
    global('autocapitalize', 'enum', ['off', 'none', 'on', 'sentences', 'words', 'characters']),
    global('autofocus', 'boolean'),
    global('class', 'token-list'),
    global('contenteditable', 'enum', ['true', 'false', 'plaintext-only']),
    global('dir', 'enum', ['ltr', 'rtl', 'auto']),
    global('draggable', 'enum', ['true', 'false']),
    global('enterkeyhint', 'enum', ['enter', 'done', 'go', 'next', 'previous', 'search', 'send']),
    global('hidden', 'boolean'),
    global('id'),
    global('inert', 'boolean'),
    global('inputmode', 'enum', ['none', 'text', 'tel', 'url', 'email', 'numeric', 'decimal', 'search']),
    global('lang'),
    global('part', 'token-list'),
    global('popover', 'enum', ['auto', 'manual', 'hint']),
    global('role'),
    global('slot'),
    global('spellcheck', 'enum', ['true', 'false']),
    global('tabindex', 'number'),
    global('title'),
    global('translate', 'enum', ['yes', 'no']),
  ] as const satisfies readonly Definition[]

  const formEncodings = ['application/x-www-form-urlencoded', 'multipart/form-data', 'text/plain'] as const
  const formMethods = ['get', 'post', 'dialog'] as const
  const targets = ['_self', '_blank', '_parent', '_top'] as const
  const referrerPolicies = [
    'no-referrer',
    'no-referrer-when-downgrade',
    'origin',
    'origin-when-cross-origin',
    'same-origin',
    'strict-origin',
    'strict-origin-when-cross-origin',
    'unsafe-url',
  ] as const

  const tagDefinitions: Partial<Record<TagCatalog.TagName, readonly Definition[]>> = {
    form: [
      local('accept-charset'),
      local('action', 'url'),
      local('autocomplete', 'enum', ['on', 'off']),
      local('enctype', 'enum', formEncodings),
      local('method', 'enum', formMethods),
      local('name'),
      local('novalidate', 'boolean'),
      local('rel', 'token-list'),
      local('target', 'enum', targets),
    ],
    label: [local('for'), local('form')],
    input: [
      local('accept'),
      local('alt'),
      local('autocomplete'),
      local('autocorrect', 'enum', ['on', 'off']),
      local('capture', 'enum', ['user', 'environment']),
      local('checked', 'boolean'),
      local('dirname'),
      local('disabled', 'boolean'),
      local('form'),
      local('formaction', 'url'),
      local('formenctype', 'enum', formEncodings),
      local('formmethod', 'enum', formMethods),
      local('formnovalidate', 'boolean'),
      local('formtarget', 'enum', targets),
      local('height', 'number'),
      local('list'),
      local('max'),
      local('maxlength', 'number'),
      local('min'),
      local('minlength', 'number'),
      local('multiple', 'boolean'),
      local('name'),
      local('pattern'),
      local('placeholder'),
      local('readonly', 'boolean'),
      local('required', 'boolean'),
      local('size', 'number'),
      local('src', 'url'),
      local('step'),
      local('type', 'enum', [
        'button', 'checkbox', 'color', 'date', 'datetime-local', 'email', 'file',
        'hidden', 'image', 'month', 'number', 'password', 'radio', 'range', 'reset',
        'search', 'submit', 'tel', 'text', 'time', 'url', 'week',
      ]),
      local('value'),
      local('width', 'number'),
      local('webkitdirectory', 'boolean'),
    ],
    textarea: [
      local('autocomplete'),
      local('cols', 'number'),
      local('dirname'),
      local('disabled', 'boolean'),
      local('form'),
      local('maxlength', 'number'),
      local('minlength', 'number'),
      local('name'),
      local('placeholder'),
      local('readonly', 'boolean'),
      local('required', 'boolean'),
      local('rows', 'number'),
      local('wrap', 'enum', ['hard', 'soft', 'off']),
    ],
    select: [
      local('autocomplete'),
      local('disabled', 'boolean'),
      local('form'),
      local('multiple', 'boolean'),
      local('name'),
      local('required', 'boolean'),
      local('size', 'number'),
      local('value'),
    ],
    option: [
      local('disabled', 'boolean'),
      local('label'),
      local('selected', 'boolean'),
      local('value'),
    ],
    button: [
      local('command'),
      local('commandfor'),
      local('disabled', 'boolean'),
      local('form'),
      local('formaction', 'url'),
      local('formenctype', 'enum', formEncodings),
      local('formmethod', 'enum', formMethods),
      local('formnovalidate', 'boolean'),
      local('formtarget', 'enum', targets),
      local('name'),
      local('popovertarget'),
      local('popovertargetaction', 'enum', ['toggle', 'show', 'hide']),
      local('type', 'enum', ['submit', 'reset', 'button']),
      local('value'),
    ],
    ol: [
      local('reversed', 'boolean'),
      local('start', 'number'),
      local('type', 'enum', ['1', 'a', 'A', 'i', 'I']),
    ],
    li: [local('value', 'number')],
    table: [
      local('border', 'number'),
      local('cellpadding', 'number'),
      local('cellspacing', 'number'),
    ],
    th: [
      local('abbr'),
      local('colspan', 'number'),
      local('headers', 'token-list'),
      local('rowspan', 'number'),
      local('scope', 'enum', ['col', 'colgroup', 'row', 'rowgroup']),
    ],
    td: [
      local('colspan', 'number'),
      local('headers', 'token-list'),
      local('rowspan', 'number'),
    ],
    img: [
      local('alt'),
      local('crossorigin', 'enum', ['anonymous', 'use-credentials']),
      local('decoding', 'enum', ['async', 'auto', 'sync']),
      local('fetchpriority', 'enum', ['auto', 'high', 'low']),
      local('height', 'number'),
      local('ismap', 'boolean'),
      local('loading', 'enum', ['eager', 'lazy']),
      local('referrerpolicy', 'enum', referrerPolicies),
      local('sizes'),
      local('src', 'url'),
      local('srcset'),
      local('usemap'),
      local('width', 'number'),
    ],
    a: [
      local('download'),
      local('href', 'url'),
      local('hreflang'),
      local('ping'),
      local('referrerpolicy', 'enum', referrerPolicies),
      local('rel', 'token-list'),
      local('target', 'enum', targets),
      local('type'),
    ],
  }

  const definitionsByTag = new Map<TagCatalog.TagName, readonly Definition[]>()
  const optionsByTag = new Map<TagCatalog.TagName, readonly Option[]>()

  export const getDefinitions = (
    tagName: TagCatalog.TagName,
  ): readonly Definition[] => {
    const cached = definitionsByTag.get(tagName)
    if (cached != null) return cached

    const definitions = [...(tagDefinitions[tagName] ?? []), ...globalDefinitions]
    definitionsByTag.set(tagName, definitions)
    return definitions
  }

  export const getDefinition = (
    tagName: TagCatalog.TagName,
    attributeName: string,
  ): Definition | null => getDefinitions(tagName).find(
    (definition) => definition.name === attributeName,
  ) ?? null

  export const getOptions = (
    tagName: TagCatalog.TagName,
  ): readonly Option[] => {
    const cached = optionsByTag.get(tagName)
    if (cached != null) return cached

    const options = getDefinitions(tagName).map((definition) => {
      const scope = definition.scope === 'global' ? 'global' : tagName
      const detail = `${definition.valueType} · ${scope}`
      return {
        value: definition.name,
        label: definition.name,
        detail,
        title: `${definition.name}: ${detail}`,
      }
    })
    optionsByTag.set(tagName, options)
    return options
  }
}

export default TagAttributeCatalog
