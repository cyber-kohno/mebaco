import { mount } from 'svelte'
import TreeStore from './state'
import McpPreviewController from '../../src/system/mcp/mcp-preview-controller'
import PreviewDialog from '../../src/system/runtime/preview/PreviewDialog.svelte'
import PreviewController from '../../src/system/runtime/preview/preview-controller'
import RuntimeSessionStore from '../../src/system/runtime/runtime-session-store'
import { get } from 'svelte/store'
import type TreeNode from '../../src/system/model/tree/tree-node'
import type Tag from '../../src/system/model/view/tag'

let nextId = 1
const node = (element: TreeNode.Node['element'], children: TreeNode.Node[] = []): TreeNode.Node => ({
  id: nextId++, element, children, isOpen: true,
})
const literal = (value: string) => ({ type: 'literal' as const, value })
const event = (name: string, source: string): Tag.EventHandler => ({
  type: 'event', name, preventDefault: false, stopPropagation: false, action: { type: 'script', source },
})
const style = (id: string, declarations: Record<string, string>): TreeNode.Node => node({
  kind: 'style', styleId: id, id, bases: [], rules: Object.entries(declarations).map(([property, value]) => ({
    type: 'declaration', property, value: literal(value),
  })),
})
const tag = (tagName: Tag.TagName, ref: string, styleIds: string[], attributes: Tag.Attribute[], children: TreeNode.Node[] = []) => node({
  kind: 'tag', tagName, comment: '', refKey: literal(ref),
  styles: styleIds.map((styleId) => ({ styleId, referenceId: crypto.randomUUID(), arguments: [] })), attributes,
}, children.some((child) => child.element.kind === 'elements')
  ? [node({ kind: 'retention' }), ...children] : children)
const state = (id: string) => node({ kind: 'state', id, valueType: { type: 'string' }, nullable: false, initial: { type: 'literal', value: '' } })

const fixture = (broken = false, overflow = false, invalidExpression = false) => {
  nextId = 1
  const editor = (id: string) => tag('div', id, ['editor'], [
    { type: 'attribute', name: 'contenteditable', value: literal('true') },
    { type: 'attribute', name: 'aria-label', value: literal(id) },
    event('input', ''), event('blur', `$state.${id} = $event.target.innerText;`),
  ], [node({ kind: 'elements' }, [node({ kind: 'text', source: { type: 'formula', source: `$state.${id}` } })])])
  const forward = tag('button', 'encode', [], [event('click',
    broken ? 'throw new Error("fixture failure");' : '$log.info("encoding"); $state.right = $state.left.split("").map(c => c.charCodeAt(0) > 127 ? "\\\\u" + c.charCodeAt(0).toString(16).padStart(4, "0") : c).join("");')],
  [node({ kind: 'elements' }, [node({ kind: 'text', source: literal('日本語 → Unicode') })])])
  const reverse = tag('button', 'decode', [], [event('click', '$state.left = $state.right.replace(/\\\\u([0-9a-fA-F]{4})/g, (match, code) => String.fromCharCode(parseInt(code, 16)));')],
  [node({ kind: 'elements' }, [node({ kind: 'text', source: literal('Unicode → 日本語') })])])
  const textarea = tag('textarea', 'textarea', ['editor'], [event('input', '$state.extra = $event.target.value;')])
  const disabled = tag('button', 'disabled', [], [{ type: 'attribute', name: 'disabled', value: { type: 'literal', value: true } }])
  const content = tag('div', 'root', ['shell'], [], [node({ kind: 'elements' }, [
    tag('header', 'header', ['header'], invalidExpression ? [{ type: 'attribute', name: 'aria-label', value: { type: 'formula', source: 'missing.value' } }] : [],
      [node({ kind: 'elements' }, [node({ kind: 'text', source: invalidExpression ? { type: 'formula', source: 'missing.value' } : literal('Preview test') })])]),
    tag('div', 'panes', ['panes'], [], [node({ kind: 'elements' }, [editor('left'), editor('right'), textarea])]),
    tag('footer', 'actions', ['actions'], [], [node({ kind: 'elements' }, [forward, reverse, disabled])]),
  ])])
  const component = node({ kind: 'component', id: 'Main', componentId: 'main-view' }, [
    node({ kind: 'store' }, [node({ kind: 'states' }, [state('left'), state('right'), state('extra')])]),
    node({ kind: 'retention' }, [
      style('shell', { display: 'flex', 'flex-direction': 'column', height: overflow ? '1200px' : '100%', 'min-height': '0', overflow: 'hidden' }),
      style('header', { 'flex-shrink': '0', height: '40px', 'font-size': '16px' }),
      style('panes', { display: 'flex', flex: '1 1 auto', 'min-height': '0', overflow: 'hidden' }),
      style('editor', { flex: '1 1 0', 'min-height': '0', 'min-width': '0', resize: 'none', overflow: 'auto', 'font-size': '16px', 'white-space': 'pre-wrap' }),
      style('actions', { 'flex-shrink': '0', height: '32px' }),
    ]), node({ kind: 'elements' }, [content]),
  ])
  TreeStore.rootNode.set(node({ kind: 'project', projectId: 'test-project' }, [
    node({ kind: 'app', id: 'test', appId: 'test-app' }, [
      node({ kind: 'entry', componentId: 'main-view', propBindings: [] }), component,
    ]),
  ]))
  TreeStore.revision.set(0)
}

mount(PreviewDialog, { target: document.getElementById('app')! })
Object.assign(window, { previewHarness: {
  fixture, handle: McpPreviewController.handle, closeManually: PreviewController.close,
  bumpRevision: () => TreeStore.revision.update((value) => value + 1),
  logBurst: () => {
    const log = get(RuntimeSessionStore.store)!.logSession.forNode(1)
    for (let index = 0; index < 150; index += 1) log.info(`${index}:${'x'.repeat(3000)}`)
  },
} })
