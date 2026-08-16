namespace StylePropertyCatalog {
  type UnitKind = 'length' | 'length-percentage' | 'angle' | 'time'

  const units: Readonly<Record<UnitKind, readonly string[]>> = {
    length: [
      'px', 'rem', 'em', 'dvh', 'dvw', 'vh', 'vw', 'vmin', 'vmax',
      'svh', 'svw', 'lvh', 'lvw', 'ch', 'ex', 'cap', 'rcap', 'ic',
      'lh', 'rlh', 'cqw', 'cqh', 'cqi', 'cqb', 'cqmin', 'cqmax',
      'cm', 'mm', 'q', 'in', 'pt', 'pc',
    ],
    'length-percentage': [
      'px', '%', 'rem', 'em', 'dvh', 'dvw', 'vh', 'vw', 'vmin', 'vmax',
      'svh', 'svw', 'lvh', 'lvw', 'ch', 'ex', 'cap', 'rcap', 'ic',
      'lh', 'rlh', 'cqw', 'cqh', 'cqi', 'cqb', 'cqmin', 'cqmax',
      'cm', 'mm', 'q', 'in', 'pt', 'pc',
    ],
    angle: ['deg', 'rad', 'grad', 'turn'],
    time: ['ms', 's'],
  }

  const unitKindsByProperty: Readonly<Record<string, readonly UnitKind[]>> = {
    width: ['length-percentage'],
    height: ['length-percentage'],
    'min-width': ['length-percentage'],
    'min-height': ['length-percentage'],
    'max-width': ['length-percentage'],
    'max-height': ['length-percentage'],
    'block-size': ['length-percentage'],
    'inline-size': ['length-percentage'],
    'min-block-size': ['length-percentage'],
    'min-inline-size': ['length-percentage'],
    'max-block-size': ['length-percentage'],
    'max-inline-size': ['length-percentage'],
    top: ['length-percentage'],
    right: ['length-percentage'],
    bottom: ['length-percentage'],
    left: ['length-percentage'],
    inset: ['length-percentage'],
    'inset-block': ['length-percentage'],
    'inset-block-start': ['length-percentage'],
    'inset-block-end': ['length-percentage'],
    'inset-inline': ['length-percentage'],
    'inset-inline-start': ['length-percentage'],
    'inset-inline-end': ['length-percentage'],
    margin: ['length-percentage'],
    'margin-top': ['length-percentage'],
    'margin-right': ['length-percentage'],
    'margin-bottom': ['length-percentage'],
    'margin-left': ['length-percentage'],
    'margin-block': ['length-percentage'],
    'margin-block-start': ['length-percentage'],
    'margin-block-end': ['length-percentage'],
    'margin-inline': ['length-percentage'],
    'margin-inline-start': ['length-percentage'],
    'margin-inline-end': ['length-percentage'],
    padding: ['length-percentage'],
    'padding-top': ['length-percentage'],
    'padding-right': ['length-percentage'],
    'padding-bottom': ['length-percentage'],
    'padding-left': ['length-percentage'],
    'padding-block': ['length-percentage'],
    'padding-block-start': ['length-percentage'],
    'padding-block-end': ['length-percentage'],
    'padding-inline': ['length-percentage'],
    'padding-inline-start': ['length-percentage'],
    'padding-inline-end': ['length-percentage'],
    gap: ['length-percentage'],
    'row-gap': ['length-percentage'],
    'column-gap': ['length-percentage'],
    'grid-gap': ['length-percentage'],
    'grid-row-gap': ['length-percentage'],
    'grid-column-gap': ['length-percentage'],
    'flex-basis': ['length-percentage'],
    'font-size': ['length-percentage'],
    'line-height': ['length-percentage'],
    'letter-spacing': ['length'],
    'word-spacing': ['length'],
    'text-indent': ['length-percentage'],
    'text-decoration-thickness': ['length-percentage'],
    'text-underline-offset': ['length-percentage'],
    'border-width': ['length'],
    'border-top-width': ['length'],
    'border-right-width': ['length'],
    'border-bottom-width': ['length'],
    'border-left-width': ['length'],
    'border-block-width': ['length'],
    'border-block-start-width': ['length'],
    'border-block-end-width': ['length'],
    'border-inline-width': ['length'],
    'border-inline-start-width': ['length'],
    'border-inline-end-width': ['length'],
    'border-radius': ['length-percentage'],
    'border-top-left-radius': ['length-percentage'],
    'border-top-right-radius': ['length-percentage'],
    'border-bottom-left-radius': ['length-percentage'],
    'border-bottom-right-radius': ['length-percentage'],
    'outline-width': ['length'],
    'outline-offset': ['length'],
    'column-width': ['length'],
    perspective: ['length'],
    'perspective-origin': ['length-percentage'],
    'transform-origin': ['length-percentage'],
    'object-position': ['length-percentage'],
    'background-position': ['length-percentage'],
    'background-position-x': ['length-percentage'],
    'background-position-y': ['length-percentage'],
    'background-size': ['length-percentage'],
    'border-spacing': ['length'],
    'shape-margin': ['length'],
    'scroll-margin': ['length'],
    'scroll-margin-top': ['length'],
    'scroll-margin-right': ['length'],
    'scroll-margin-bottom': ['length'],
    'scroll-margin-left': ['length'],
    'scroll-padding': ['length-percentage'],
    'scroll-padding-top': ['length-percentage'],
    'scroll-padding-right': ['length-percentage'],
    'scroll-padding-bottom': ['length-percentage'],
    'scroll-padding-left': ['length-percentage'],
    rotate: ['angle'],
    'offset-rotate': ['angle'],
    transform: ['length-percentage', 'angle'],
    'animation-delay': ['time'],
    'animation-duration': ['time'],
    'transition-delay': ['time'],
    'transition-duration': ['time'],
    animation: ['time'],
    transition: ['time'],
  }

  const globalKeywordValues = [
    'inherit',
    'initial',
    'unset',
    'revert',
    'revert-layer',
  ] as const

  const colorPropertyNames = new Set([
    'accent-color',
    'background-color',
    'border-color',
    'border-block-color',
    'border-block-end-color',
    'border-block-start-color',
    'border-bottom-color',
    'border-inline-color',
    'border-inline-end-color',
    'border-inline-start-color',
    'border-left-color',
    'border-right-color',
    'border-top-color',
    'caret-color',
    'color',
    'column-rule-color',
    'fill',
    'flood-color',
    'lighting-color',
    'outline-color',
    'stop-color',
    'stroke',
    'text-decoration-color',
    'text-emphasis-color',
  ])

  const keywordValues: Readonly<Record<string, readonly string[]>> = {
    display: [
      'block', 'inline', 'inline-block', 'flex', 'inline-flex',
      'grid', 'inline-grid', 'flow-root', 'contents', 'none',
    ],
    position: ['static', 'relative', 'absolute', 'fixed', 'sticky'],
    'box-sizing': ['content-box', 'border-box'],
    overflow: ['visible', 'hidden', 'clip', 'scroll', 'auto'],
    'overflow-x': ['visible', 'hidden', 'clip', 'scroll', 'auto'],
    'overflow-y': ['visible', 'hidden', 'clip', 'scroll', 'auto'],
    visibility: ['visible', 'hidden', 'collapse'],
    float: ['none', 'left', 'right', 'inline-start', 'inline-end'],
    clear: ['none', 'left', 'right', 'both', 'inline-start', 'inline-end'],
    isolation: ['auto', 'isolate'],
    resize: ['none', 'both', 'horizontal', 'vertical', 'block', 'inline'],
    cursor: [
      'auto', 'default', 'pointer', 'text', 'move', 'not-allowed',
      'grab', 'grabbing', 'crosshair', 'wait', 'help', 'zoom-in', 'zoom-out',
    ],
    'pointer-events': ['auto', 'none'],
    'user-select': ['auto', 'text', 'none', 'contain', 'all'],
    'flex-direction': ['row', 'row-reverse', 'column', 'column-reverse'],
    'flex-wrap': ['nowrap', 'wrap', 'wrap-reverse'],
    'align-content': [
      'normal', 'start', 'center', 'end', 'space-between', 'space-around',
      'space-evenly', 'stretch', 'baseline',
    ],
    'align-items': ['normal', 'stretch', 'start', 'center', 'end', 'baseline'],
    'align-self': ['auto', 'normal', 'stretch', 'start', 'center', 'end', 'baseline'],
    'justify-content': [
      'normal', 'start', 'center', 'end', 'left', 'right',
      'space-between', 'space-around', 'space-evenly', 'stretch',
    ],
    'justify-items': ['normal', 'stretch', 'start', 'center', 'end', 'left', 'right'],
    'justify-self': ['auto', 'normal', 'stretch', 'start', 'center', 'end', 'left', 'right'],
    'grid-auto-flow': ['row', 'column', 'dense', 'row dense', 'column dense'],
    'object-fit': ['fill', 'contain', 'cover', 'none', 'scale-down'],
    'font-style': ['normal', 'italic', 'oblique'],
    'font-weight': ['normal', 'bold', 'bolder', 'lighter'],
    'font-stretch': [
      'normal', 'condensed', 'semi-condensed', 'extra-condensed', 'ultra-condensed',
      'expanded', 'semi-expanded', 'extra-expanded', 'ultra-expanded',
    ],
    'text-align': ['start', 'end', 'left', 'right', 'center', 'justify', 'match-parent'],
    'text-transform': ['none', 'capitalize', 'uppercase', 'lowercase', 'full-width'],
    'text-overflow': ['clip', 'ellipsis'],
    'text-decoration-line': ['none', 'underline', 'overline', 'line-through'],
    'text-decoration-style': ['solid', 'double', 'dotted', 'dashed', 'wavy'],
    'white-space': ['normal', 'pre', 'pre-wrap', 'pre-line', 'nowrap', 'break-spaces'],
    'word-break': ['normal', 'break-all', 'keep-all', 'break-word'],
    'overflow-wrap': ['normal', 'break-word', 'anywhere'],
    hyphens: ['none', 'manual', 'auto'],
    'list-style-position': ['inside', 'outside'],
    'border-style': ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'],
    'border-top-style': ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'],
    'border-right-style': ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'],
    'border-bottom-style': ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'],
    'border-left-style': ['none', 'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'],
    'background-repeat': ['repeat', 'repeat-x', 'repeat-y', 'space', 'round', 'no-repeat'],
    'background-attachment': ['scroll', 'fixed', 'local'],
    'background-clip': ['border-box', 'padding-box', 'content-box', 'text'],
    'background-origin': ['border-box', 'padding-box', 'content-box'],
    'border-collapse': ['separate', 'collapse'],
    'table-layout': ['auto', 'fixed'],
    'caption-side': ['top', 'bottom'],
  }

  const frequentNames = [
    'display', 'position', 'width', 'height',
    'min-width', 'min-height', 'max-width', 'max-height',
    'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'background', 'background-color', 'color',
    'font-size', 'font-weight', 'line-height',
    'border', 'border-color', 'border-radius', 'box-shadow',
    'gap', 'row-gap', 'column-gap',
    'flex-direction', 'align-items', 'justify-content',
    'overflow', 'overflow-x', 'overflow-y', 'opacity',
  ] as const

  // Generated from CSSStyleProperties in TypeScript's standard lib.dom.d.ts.
  // The runtime only consumes this static snapshot and never queries the browser.
  const standardNames = `
accent-color
align-content
align-items
align-self
alignment-baseline
all
anchor-name
anchor-scope
animation
animation-composition
animation-delay
animation-direction
animation-duration
animation-fill-mode
animation-iteration-count
animation-name
animation-play-state
animation-range
animation-range-end
animation-range-start
animation-timeline
animation-timing-function
appearance
aspect-ratio
backdrop-filter
backface-visibility
background
background-attachment
background-blend-mode
background-clip
background-color
background-image
background-origin
background-position
background-position-x
background-position-y
background-repeat
background-size
baseline-shift
baseline-source
block-size
border
border-block
border-block-color
border-block-end
border-block-end-color
border-block-end-style
border-block-end-width
border-block-start
border-block-start-color
border-block-start-style
border-block-start-width
border-block-style
border-block-width
border-bottom
border-bottom-color
border-bottom-left-radius
border-bottom-right-radius
border-bottom-style
border-bottom-width
border-collapse
border-color
border-end-end-radius
border-end-start-radius
border-image
border-image-outset
border-image-repeat
border-image-slice
border-image-source
border-image-width
border-inline
border-inline-color
border-inline-end
border-inline-end-color
border-inline-end-style
border-inline-end-width
border-inline-start
border-inline-start-color
border-inline-start-style
border-inline-start-width
border-inline-style
border-inline-width
border-left
border-left-color
border-left-style
border-left-width
border-radius
border-right
border-right-color
border-right-style
border-right-width
border-spacing
border-start-end-radius
border-start-start-radius
border-style
border-top
border-top-color
border-top-left-radius
border-top-right-radius
border-top-style
border-top-width
border-width
bottom
box-decoration-break
box-shadow
box-sizing
break-after
break-before
break-inside
caption-side
caret-color
clear
clip
clip-path
clip-rule
color
color-interpolation
color-interpolation-filters
color-scheme
column-count
column-fill
column-gap
column-rule
column-rule-color
column-rule-style
column-rule-width
column-span
column-width
columns
contain
contain-intrinsic-block-size
contain-intrinsic-height
contain-intrinsic-inline-size
contain-intrinsic-size
contain-intrinsic-width
container
container-name
container-type
content
content-visibility
counter-increment
counter-reset
counter-set
cursor
cx
cy
d
direction
display
dominant-baseline
dynamic-range-limit
empty-cells
field-sizing
fill
fill-opacity
fill-rule
filter
flex
flex-basis
flex-direction
flex-flow
flex-grow
flex-shrink
flex-wrap
float
flood-color
flood-opacity
font
font-family
font-feature-settings
font-kerning
font-language-override
font-optical-sizing
font-palette
font-size
font-size-adjust
font-stretch
font-style
font-synthesis
font-synthesis-small-caps
font-synthesis-style
font-synthesis-weight
font-variant
font-variant-alternates
font-variant-caps
font-variant-east-asian
font-variant-emoji
font-variant-ligatures
font-variant-numeric
font-variant-position
font-variation-settings
font-weight
forced-color-adjust
gap
grid
grid-area
grid-auto-columns
grid-auto-flow
grid-auto-rows
grid-column
grid-column-end
grid-column-gap
grid-column-start
grid-gap
grid-row
grid-row-end
grid-row-gap
grid-row-start
grid-template
grid-template-areas
grid-template-columns
grid-template-rows
height
hyphenate-character
hyphenate-limit-chars
hyphens
image-orientation
image-rendering
inline-size
inset
inset-block
inset-block-end
inset-block-start
inset-inline
inset-inline-end
inset-inline-start
isolation
justify-content
justify-items
justify-self
left
letter-spacing
lighting-color
line-break
line-height
list-style
list-style-image
list-style-position
list-style-type
margin
margin-block
margin-block-end
margin-block-start
margin-bottom
margin-inline
margin-inline-end
margin-inline-start
margin-left
margin-right
margin-top
marker
marker-end
marker-mid
marker-start
mask
mask-clip
mask-composite
mask-image
mask-mode
mask-origin
mask-position
mask-repeat
mask-size
mask-type
math-depth
math-shift
math-style
max-block-size
max-height
max-inline-size
max-width
min-block-size
min-height
min-inline-size
min-width
mix-blend-mode
object-fit
object-position
offset
offset-anchor
offset-distance
offset-path
offset-position
offset-rotate
opacity
order
orphans
outline
outline-color
outline-offset
outline-style
outline-width
overflow
overflow-anchor
overflow-block
overflow-clip-margin
overflow-inline
overflow-wrap
overflow-x
overflow-y
overscroll-behavior
overscroll-behavior-block
overscroll-behavior-inline
overscroll-behavior-x
overscroll-behavior-y
padding
padding-block
padding-block-end
padding-block-start
padding-bottom
padding-inline
padding-inline-end
padding-inline-start
padding-left
padding-right
padding-top
page
page-break-after
page-break-before
page-break-inside
paint-order
perspective
perspective-origin
place-content
place-items
place-self
pointer-events
position
position-anchor
position-area
position-try
position-try-fallbacks
position-try-order
position-visibility
print-color-adjust
quotes
r
resize
right
rotate
row-gap
ruby-align
ruby-position
rx
ry
scale
scroll-behavior
scroll-margin
scroll-margin-block
scroll-margin-block-end
scroll-margin-block-start
scroll-margin-bottom
scroll-margin-inline
scroll-margin-inline-end
scroll-margin-inline-start
scroll-margin-left
scroll-margin-right
scroll-margin-top
scroll-padding
scroll-padding-block
scroll-padding-block-end
scroll-padding-block-start
scroll-padding-bottom
scroll-padding-inline
scroll-padding-inline-end
scroll-padding-inline-start
scroll-padding-left
scroll-padding-right
scroll-padding-top
scroll-snap-align
scroll-snap-stop
scroll-snap-type
scroll-timeline
scroll-timeline-axis
scroll-timeline-name
scrollbar-color
scrollbar-gutter
scrollbar-width
shape-image-threshold
shape-margin
shape-outside
shape-rendering
stop-color
stop-opacity
stroke
stroke-dasharray
stroke-dashoffset
stroke-linecap
stroke-linejoin
stroke-miterlimit
stroke-opacity
stroke-width
tab-size
table-layout
text-align
text-align-last
text-anchor
text-autospace
text-box
text-box-edge
text-box-trim
text-combine-upright
text-decoration
text-decoration-color
text-decoration-line
text-decoration-skip-ink
text-decoration-style
text-decoration-thickness
text-emphasis
text-emphasis-color
text-emphasis-position
text-emphasis-style
text-indent
text-justify
text-orientation
text-overflow
text-rendering
text-shadow
text-transform
text-underline-offset
text-underline-position
text-wrap
text-wrap-mode
text-wrap-style
timeline-scope
top
touch-action
transform
transform-box
transform-origin
transform-style
transition
transition-behavior
transition-delay
transition-duration
transition-property
transition-timing-function
translate
unicode-bidi
user-select
vector-effect
vertical-align
view-timeline
view-timeline-axis
view-timeline-inset
view-timeline-name
view-transition-class
view-transition-name
visibility
white-space
white-space-collapse
widows
width
will-change
word-break
word-spacing
word-wrap
writing-mode
x
y
z-index
zoom
`.trim().split(/\s+/)

  export const names: readonly string[] = Array.from(new Set([
    ...frequentNames,
    ...standardNames,
  ]))

  export const options = names.map((name) => ({
    value: name,
  }))

  const createUnitValues = (
    propertyName: string,
    source: string,
  ): string[] => {
    const unitKinds = unitKindsByProperty[propertyName]
    if (unitKinds == null) return []

    const token = /(^|[\s,(*/+-])(-?(?:\d+(?:\.\d*)?|\.\d+))([a-z%]*)$/i.exec(source)
    if (token == null) return []

    const numericStart = source.length - token[2].length - token[3].length
    const prefix = source.slice(0, numericStart)
    const number = token[2]
    const suffixes = Array.from(new Set(unitKinds.flatMap((kind) => units[kind])))
    return suffixes.map((unit) => `${prefix}${number}${unit}`)
  }

  export const getLiteralOptions = (
    propertyName: string,
    source = '',
  ) => {
    if (propertyName.startsWith('--')) return []

    return Array.from(new Set([
      ...(keywordValues[propertyName] ?? []),
      ...globalKeywordValues,
      ...createUnitValues(propertyName, source),
    ])).map((value) => ({ value }))
  }

  export const isColorProperty = (propertyName: string): boolean => (
    colorPropertyNames.has(propertyName)
  )

  export const contains = (propertyName: string): boolean => (
    names.includes(propertyName)
  )
}

export default StylePropertyCatalog
