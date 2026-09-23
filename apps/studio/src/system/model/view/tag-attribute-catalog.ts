import HtmlTag from '@system/model/element/html-tag'

namespace TagAttributeCatalog {
  type DefinitionKind =
    | 'string'
    | 'number'
    | 'boolean'
    | 'enum'
    | 'url'
    | 'token-list'

  export type PrimitiveType = 'string' | 'number' | 'boolean'

  export type Editor =
    | { type: 'text' }
    | { type: 'url' }
    | { type: 'token-list' }
    | { type: 'enum', values: readonly string[] }

  export type Definition = {
    name: string
    primitiveType: PrimitiveType
    editor: Editor
    scope: 'global' | 'tag' | 'data'
  }

  export type Policy =
    | { status: 'supported', definition: Definition }
    | { status: 'reserved', reason: string, replacement?: string }
    | { status: 'unknown' }

  export type Option = {
    value: string
    label: string
    title: string
  }

  const createDefinition = (
    name: string,
    kind: DefinitionKind,
    values: readonly string[] | undefined,
    scope: Definition['scope'],
  ): Definition => ({
    name,
    primitiveType: kind === 'number' || kind === 'boolean' ? kind : 'string',
    editor: kind === 'enum'
      ? { type: 'enum', values: values ?? [] }
      : kind === 'url'
        ? { type: 'url' }
        : kind === 'token-list'
          ? { type: 'token-list' }
          : { type: 'text' },
    scope,
  })

  const global = (
    name: string,
    kind: DefinitionKind = 'string',
    values?: readonly string[],
  ): Definition => createDefinition(name, kind, values, 'global')

  const local = (
    name: string,
    kind: DefinitionKind = 'string',
    values?: readonly string[],
  ): Definition => createDefinition(name, kind, values, 'tag')

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
    global('contenteditable', 'enum', ['true', 'false', 'plaintext-only']),
    global('dir', 'enum', ['ltr', 'rtl', 'auto']),
    global('draggable', 'enum', ['true', 'false']),
    global('enterkeyhint', 'enum', ['enter', 'done', 'go', 'next', 'previous', 'search', 'send']),
    global('id'),
    global('inert', 'boolean'),
    global('inputmode', 'enum', ['none', 'text', 'tel', 'url', 'email', 'numeric', 'decimal', 'search']),
    global('lang'),
    global('popover', 'enum', ['auto', 'manual', 'hint']),
    global('role'),
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

  const tagDefinitions: Partial<Record<HtmlTag.TagName, readonly Definition[]>> = {
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

  const definitionsByTag = new Map<string, readonly Definition[]>()
  const optionsByTag = new Map<string, readonly Option[]>()

  const reservedAttributes = new Map<string, { reason: string, replacement?: string }>([
    ['class', { reason: 'Class-based styling bypasses the Mebaco style system.', replacement: 'Use the Styles tab.' }],
    ['classname', { reason: 'Class-based styling bypasses the Mebaco style system.', replacement: 'Use the Styles tab.' }],
    ['style', { reason: 'Inline styles bypass the Mebaco style system.', replacement: 'Use the Styles tab.' }],
    ['csstext', { reason: 'Inline styles bypass the Mebaco style system.', replacement: 'Use the Styles tab.' }],
    ['hidden', { reason: 'Attribute visibility bypasses Mebaco rendering and styles.', replacement: 'Use a condition or the Styles tab.' }],
    ['innerhtml', { reason: 'Direct HTML replacement bypasses the Mebaco element tree.', replacement: 'Use Mebaco elements.' }],
    ['outerhtml', { reason: 'Direct HTML replacement bypasses the Mebaco element tree.', replacement: 'Use Mebaco elements.' }],
    ['textcontent', { reason: 'Direct text replacement bypasses the Mebaco element tree.', replacement: 'Use a Text element.' }],
    ['innertext', { reason: 'Direct text replacement bypasses the Mebaco element tree.', replacement: 'Use a Text element.' }],
    ['children', { reason: 'Direct child replacement bypasses the Mebaco element tree.', replacement: 'Use Mebaco elements.' }],
    ['slot', { reason: 'Native slot assignment conflicts with the Mebaco Slot system.', replacement: 'Use a Mebaco Slot.' }],
    ['part', { reason: 'External part styling bypasses the Mebaco style system.', replacement: 'Use the Styles tab.' }],
    ['exportparts', { reason: 'External part styling bypasses the Mebaco style system.', replacement: 'Use the Styles tab.' }],
    ['border', { reason: 'Presentational HTML attributes bypass the Mebaco style system.', replacement: 'Use the Styles tab.' }],
    ['cellpadding', { reason: 'Presentational HTML attributes bypass the Mebaco style system.', replacement: 'Use the Styles tab.' }],
    ['cellspacing', { reason: 'Presentational HTML attributes bypass the Mebaco style system.', replacement: 'Use the Styles tab.' }],
    ['bgcolor', { reason: 'Presentational HTML attributes bypass the Mebaco style system.', replacement: 'Use the Styles tab.' }],
    ['align', { reason: 'Presentational HTML attributes bypass the Mebaco style system.', replacement: 'Use the Styles tab.' }],
    ['valign', { reason: 'Presentational HTML attributes bypass the Mebaco style system.', replacement: 'Use the Styles tab.' }],
  ])

  const reservedDirectivePattern = /^(?:bind|use|transition|in|out|animate|let|class|style):/

  export const resolvePolicy = (
    tagName: string,
    attributeName: string,
  ): Policy => {
    const normalizedName = attributeName.toLowerCase()
    const exactReservation = reservedAttributes.get(normalizedName)
    if (exactReservation != null) return { status: 'reserved', ...exactReservation }
    if (normalizedName.startsWith('on')) {
      return {
        status: 'reserved',
        reason: 'Event attributes bypass the Mebaco Event and Action system.',
        replacement: 'Use Add Event.',
      }
    }
    if (reservedDirectivePattern.test(normalizedName)) {
      return {
        status: 'reserved',
        reason: 'Framework directive syntax is not available as a runtime attribute.',
        replacement: 'Use the corresponding Mebaco feature.',
      }
    }
    if (normalizedName.startsWith('data-mbc-') || normalizedName.startsWith('mbc-')) {
      return {
        status: 'reserved',
        reason: 'This name belongs to the Mebaco internal namespace.',
      }
    }

    const definition = getDefinitions(tagName).find(
      (candidate) => candidate.name === normalizedName,
    ) ?? (/^data-[a-z0-9_.:-]+$/.test(normalizedName)
      ? createDefinition(normalizedName, 'string', undefined, 'data')
      : null)
    return definition == null
      ? { status: 'unknown' }
      : { status: 'supported', definition }
  }

  export const getDefinitions = (
    tagName: string,
  ): readonly Definition[] => {
    const cached = definitionsByTag.get(tagName)
    if (cached != null) return cached

    const definitions = [
      ...(HtmlTag.isTagName(tagName) ? tagDefinitions[tagName] ?? [] : []),
      ...globalDefinitions,
    ]
    definitionsByTag.set(tagName, definitions)
    return definitions
  }

  export const getDefinition = (
    tagName: string,
    attributeName: string,
  ): Definition | null => {
    const policy = resolvePolicy(tagName, attributeName)
    return policy.status === 'supported' ? policy.definition : null
  }

  export const getOptions = (
    tagName: string,
  ): readonly Option[] => {
    const cached = optionsByTag.get(tagName)
    if (cached != null) return cached

    const options = getDefinitions(tagName).map((definition) => {
      const scope = definition.scope === 'global' ? 'global' : tagName
      const detail = `${definition.primitiveType} · ${scope}`
      return {
        value: definition.name,
        label: definition.name,
        title: `${definition.name}: ${detail}`,
      }
    })
    optionsByTag.set(tagName, options)
    return options
  }
}

export default TagAttributeCatalog
