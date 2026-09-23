import { describe, expect, it } from 'vitest'
import type TreeNode from '@system/model/tree/tree-node'
import RuntimeConstant from './runtime-constant'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

const constant = (id: number, name: string, source: string) => node(id, {
  kind: 'constant', id: name, typeSetting: { type: 'inferred' }, source,
})

describe('RuntimeConstant', () => {
  it('evaluates Common then App constants and returns a readonly namespace', () => {
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'common' }, [
        node(3, { kind: 'declares' }, [
          node(4, { kind: 'constants' }, [constant(5, 'puzzleSize', '640')]),
        ]),
      ]),
      node(6, { kind: 'apps' }, [
        node(7, { kind: 'app', appId: 'app-id', id: 'app' }, [
          node(8, { kind: 'declares' }, [
            node(9, { kind: 'constants' }, [
              constant(10, 'divisions', '4'),
              constant(11, 'pieceSize', '$const.puzzleSize / $const.divisions'),
            ]),
          ]),
        ]),
      ]),
    ])

    const result = RuntimeConstant.create(root, 7)

    expect(result.errors).toEqual([])
    expect(result.values).toEqual({ puzzleSize: 640, divisions: 4, pieceSize: 160 })
    expect(() => {
      ;(result.values as Record<string, unknown>).divisions = 3
    }).toThrow("Constant 'divisions' is readonly.")
  })
})
