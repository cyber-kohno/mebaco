namespace HtmlTag {
  export type TagName =
    // layout
    | 'div'
    | 'span'
    // text
    | 'p'
    | 'h1'
    | 'h2'
    | 'h3'
    | 'h4'
    | 'h5'
    | 'h6'
    // form
    | 'form'
    | 'label'
    | 'input'
    | 'textarea'
    | 'select'
    | 'option'
    | 'button'
    // list
    | 'ul'
    | 'ol'
    | 'li'
    // table
    | 'table'
    | 'thead'
    | 'tbody'
    | 'tr'
    | 'th'
    | 'td'
    // media
    | 'img'
    // utility
    | 'a'
    | 'br'

  export const tagNames = [
    // layout
    'div',
    'span',
    // text
    'p',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    // form
    'form',
    'label',
    'input',
    'textarea',
    'select',
    'option',
    'button',
    // list
    'ul',
    'ol',
    'li',
    // table
    'table',
    'thead',
    'tbody',
    'tr',
    'th',
    'td',
    // media
    'img',
    // utility
    'a',
    'br',
  ] satisfies readonly TagName[]

  export const voidTagNames = [
    'input',
    'img',
    'br',
  ] satisfies readonly TagName[]

  export const isTagName = (value: string): value is TagName =>
    tagNames.some((tagName) => tagName === value)

  export const canHaveChildren = (tagName: TagName): boolean =>
    voidTagNames.every((voidTagName) => voidTagName !== tagName)
}

export default HtmlTag
