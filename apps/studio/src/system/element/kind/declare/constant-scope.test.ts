import { describe, expect, it } from 'vitest'
import type TreeNode from '../../../tree/tree-node'
import ConstantScope from './constant-scope'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

const constant = (id: number, name: string, source: string) => node(id, {
  kind: 'constant', id: name, typeSetting: { type: 'inferred' }, source,
})

describe('ConstantScope', () => {
  it('exposes Common constants and only preceding App constants', () => {
    const commonSize = constant(5, 'baseSize', '640')
    const divisions = constant(10, 'divisions', '4')
    const pieceSize = constant(11, 'pieceSize', '$const.baseSize / $const.divisions')
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'common' }, [
        node(3, { kind: 'declares' }, [node(4, { kind: 'constants' }, [commonSize])]),
      ]),
      node(6, { kind: 'apps' }, [
        node(7, { kind: 'app', appId: 'app-id', id: 'app' }, [
          node(8, { kind: 'declares' }, [
            node(9, { kind: 'constants' }, [divisions, pieceSize]),
          ]),
        ]),
      ]),
    ])

    expect(ConstantScope.collectVisible(root, pieceSize.id).map((entry) => entry.element.id))
      .toEqual(['baseSize', 'divisions'])
    expect(ConstantScope.collectVisible(root, divisions.id).map((entry) => entry.element.id))
      .toEqual(['baseSize'])
    expect(ConstantScope.collectVisible(root, 7).map((entry) => entry.element.id))
      .toEqual(['baseSize', 'divisions', 'pieceSize'])
  })

  it('reserves a new Common name used by an App constant', () => {
    const root = node(1, { kind: 'project' }, [
      node(2, { kind: 'common' }, [
        node(3, { kind: 'declares' }, [node(4, { kind: 'constants' })]),
      ]),
      node(5, { kind: 'apps' }, [
        node(6, { kind: 'app', appId: 'app-id', id: 'app' }, [
          node(7, { kind: 'declares' }, [
            node(8, { kind: 'constants' }, [constant(9, 'divisions', '4')]),
          ]),
        ]),
      ]),
    ])

    expect(ConstantScope.getReservedNames(root, 4)).toContain('divisions')
  })
})
