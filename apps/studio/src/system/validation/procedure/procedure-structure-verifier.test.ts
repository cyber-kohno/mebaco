import { describe, expect, it } from 'vitest'
import type TreeNode from '../../tree/tree-node'
import ProcedureStructureVerifier from './procedure-structure-verifier'

const node = (
  id: number,
  element: TreeNode.Node['element'],
  children: TreeNode.Node[] = [],
  disabled = false,
): TreeNode.Node => ({ id, element, children, isOpen: true, disabled })

describe('ProcedureStructureVerifier', () => {
  it('reports enabled siblings after an unconditional Return', () => {
    const procedure = node(1, { kind: 'function-procedure' }, [
      node(2, { kind: 'action', comment: '', source: 'before()' }),
      node(3, { kind: 'function-return' }),
      node(4, { kind: 'action', comment: '', source: 'after()' }),
      node(5, { kind: 'function-return' }),
    ])

    expect(ProcedureStructureVerifier.verify(procedure)).toEqual([
      'node-4 is unreachable because it follows Return node-3.',
      'node-5 is unreachable because it follows Return node-3.',
    ])
  })

  it('checks branch sequences without treating a conditional Return as unconditional', () => {
    const procedure = node(1, { kind: 'function-procedure' }, [
      node(2, { kind: 'control-conditional' }, [
        node(3, { kind: 'if', condition: 'true' }, [
          node(4, { kind: 'function-return' }),
          node(5, { kind: 'action', comment: '', source: 'unreachable()' }),
        ]),
      ]),
      node(6, { kind: 'action', comment: '', source: 'reachable()' }),
    ])

    expect(ProcedureStructureVerifier.verify(procedure)).toEqual([
      'node-5 is unreachable because it follows Return node-4.',
    ])
  })

  it('ignores disabled siblings and nested Function execution flows', () => {
    const procedure = node(1, { kind: 'function-procedure' }, [
      node(2, {
        kind: 'function', id: 'nested',
        signature: { mode: 'inline', definition: { async: false, parameters: [], returnType: null } },
        implementation: { mode: 'procedure' },
      }, [
        node(3, { kind: 'function-procedure' }, [
          node(4, { kind: 'function-return' }),
          node(5, { kind: 'action', comment: '', source: 'nestedDead()' }),
        ]),
      ]),
      node(6, { kind: 'function-return' }),
      node(7, { kind: 'action', comment: '', source: 'disabled()' }, [], true),
    ])

    expect(ProcedureStructureVerifier.verify(procedure)).toEqual([])
  })

  it('validates Promise branches and rejects Return inside them', () => {
    const procedure = node(1, { kind: 'function-procedure' }, [
      node(2, {
        kind: 'promise', id: 'result',
        resultType: { valueType: { type: 'number' }, nullable: false },
        source: 'Promise.resolve(1)',
      }, [
        node(3, { kind: 'promise-catch', id: 'error' }),
        node(4, { kind: 'promise-then' }, [
          node(5, { kind: 'function-return' }),
        ]),
        node(6, { kind: 'promise-catch', id: 'otherError' }),
      ]),
    ])

    expect(ProcedureStructureVerifier.verify(procedure)).toEqual([
      'Promise node-2 can contain at most one Catch branch.',
      'Promise node-2 Catch must follow Then.',
      'Return node-5 is not allowed inside a Promise Then or Catch branch.',
    ])
  })
})
