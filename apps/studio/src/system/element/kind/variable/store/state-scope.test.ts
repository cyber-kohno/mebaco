import { describe, expect, it } from 'vitest'
import type TreeNode from '../../../../tree/tree-node'
import StateScope from './state-scope'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id, element, isOpen: true, children })

describe('StateScope', () => {
  it('collects App and ancestor Component State IDs', () => {
    const rootNode = node(1, { kind: 'project' }, [
      node(2, { kind: 'apps' }, [
        node(3, { kind: 'app', id: 'Main' }, [
          node(4, { kind: 'store' }, [
            node(5, { kind: 'states' }, [
              node(6, {
                kind: 'state',
                id: 'appValue',
                valueType: { type: 'string' },
                nullable: false,
                initial: { type: 'default' },
              }),
            ]),
          ]),
          node(7, { kind: 'component', id: 'Panel' }, [
            node(8, { kind: 'store' }, [
              node(9, { kind: 'states' }, [
                node(10, {
                  kind: 'state',
                  id: 'panelValue',
                  valueType: { type: 'string' },
                  nullable: false,
                  initial: { type: 'default' },
                }),
              ]),
            ]),
          ]),
        ]),
      ]),
    ])

    expect(StateScope.getAncestorStateIds(rootNode, 9)).toEqual(['appValue', 'panelValue'])
  })
})
