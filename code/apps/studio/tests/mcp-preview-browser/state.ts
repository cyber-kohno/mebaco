import { writable } from 'svelte/store'
import type TreeNode from '../../src/system/model/tree/tree-node'

// Used only by the isolated browser test server, never by Studio.
export default {
  rootNode: writable<TreeNode.Node>({ id: 1, element: { kind: 'project' }, children: [], isOpen: true }),
  revision: writable(0),
}
