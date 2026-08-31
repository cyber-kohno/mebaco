import { beforeEach, describe, expect, it, vi } from 'vitest'
import type TreeNode from '../../../tree/tree-node'
import PromiseElement from './promise-element'
import PromiseThenElement from './promise-then-element'
import BlockElement from '../block/block-element'
import TreeStore from '../../../store/tree-store'
import PromiseCatchElement from './promise-catch-element'

vi.mock('../../../store/tree-store', () => ({
  default: {
    addChild: vi.fn(),
    removeNode: vi.fn(),
  },
}))

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, children, isOpen: true })

describe('Promise statement UI model', () => {
  beforeEach(() => vi.clearAllMocks())

  it('stores Void or a typed result and expects a Promise expression', () => {
    const schema = PromiseElement.createSchema()
    const sourceField = schema.fields.find((field) => field.key === 'source')
    expect(sourceField).toMatchObject({ type: 'formula', label: 'Promise', required: true })
    if (sourceField?.type !== 'formula') return

    const valueType = JSON.stringify({
      valueType: { type: 'array', item: { type: 'number' } },
      nullable: true,
    })
    expect(sourceField.getExpectedTypeText?.({ resultMode: 'value', valueType }))
      .toBe('Promise<number[] | null>')
    expect(sourceField.getExpectedTypeText?.({ resultMode: 'void', valueType }))
      .toBe('Promise<void>')

    expect(schema.create({
      resultMode: 'void', id: 'ignored', valueType,
      source: 'Promise.resolve()',
    })).toEqual({
      kind: 'promise', id: '', resultType: null, source: 'Promise.resolve()',
    })
  })

  it('creates Then by default and never offers Return inside Promise branches', () => {
    expect(PromiseElement.definition.createInitialChildren?.())
      .toEqual([{ element: { kind: 'promise-then' } }])

    const block = node(5, BlockElement.create())
    const thenNode = node(4, PromiseThenElement.create(), [block])
    const promise = node(3, PromiseElement.create(), [thenNode])
    const procedure = node(2, { kind: 'function-procedure' }, [promise])
    const root = node(1, { kind: 'project' }, [procedure])
    const menu = BlockElement.definition.getContextMenu({
      element: block.element as Extract<TreeNode.Node['element'], { kind: 'block' }>,
      node: block as TreeNode.Node & {
        element: Extract<TreeNode.Node['element'], { kind: 'block' }>
      },
      parentNode: thenNode,
      rootNode: root,
    })
    const statementMenu = menu.find((item) => item.label === 'Add statement')
    expect(statementMenu?.type).toBe('parent')
    if (statementMenu?.type !== 'parent') return
    expect(statementMenu.children.map((item) => item.label))
      .toEqual(['Action', 'Promise', 'Transition'])
  })

  it('toggles Catch from the Promise menu and deletes it from its own menu', () => {
    const thenNode = node(4, PromiseThenElement.create())
    const promise = node(3, PromiseElement.create(), [thenNode])
    const root = node(1, { kind: 'project' }, [promise])
    const promiseContext = {
      element: promise.element as PromiseElement.Element,
      node: promise as TreeNode.Node & { element: PromiseElement.Element },
      parentNode: root,
      rootNode: root,
    }

    const withoutCatch = PromiseElement.definition.getContextMenu(promiseContext)
    expect(withoutCatch.map((item) => item.label)).toEqual([
      'Modify', 'Use catch', 'Delete',
    ])
    const useCatch = withoutCatch.find((item) => item.label === 'Use catch')
    if (useCatch?.type !== 'action') throw new Error('Use catch was not found.')
    useCatch.callback()
    expect(TreeStore.addChild).toHaveBeenCalledWith(
      promise.id,
      PromiseCatchElement.create(),
    )

    const catchNode = node(5, PromiseCatchElement.create(), [
      node(6, { kind: 'action', comment: '', source: 'handle()' }),
    ])
    promise.children.push(catchNode)
    const withCatch = PromiseElement.definition.getContextMenu(promiseContext)
    expect(withCatch.map((item) => item.label)).toEqual([
      'Modify', 'Remove catch', 'Delete',
    ])
    const removeCatch = withCatch.find((item) => item.label === 'Remove catch')
    if (removeCatch?.type !== 'action') throw new Error('Remove catch was not found.')
    removeCatch.callback()
    expect(TreeStore.removeNode).toHaveBeenCalledWith(catchNode.id)

    vi.mocked(TreeStore.removeNode).mockClear()
    const catchItems = PromiseCatchElement.definition.getContextMenu({
      element: catchNode.element as PromiseCatchElement.Element,
      node: catchNode as TreeNode.Node & { element: PromiseCatchElement.Element },
      parentNode: promise,
      rootNode: root,
    })
    expect(catchItems.at(-1)?.label).toBe('Delete')
    const deleteCatch = catchItems.at(-1)
    if (deleteCatch?.type !== 'action') throw new Error('Delete was not found.')
    deleteCatch.callback()
    expect(TreeStore.removeNode).toHaveBeenCalledWith(catchNode.id)
  })
})
