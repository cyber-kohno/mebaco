import { describe, expect, it } from 'vitest'
import type MebacoElement from '../../element/element'
import type TreeNode from '../../tree/tree-node'
import FormulaContext from '../formula/formula-context'
import FunctionRunner from './function-runner'
import VariableFrame from '../variable/variable-frame'

let nextNodeId = 1
const node = (
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id: nextNodeId++, element, children, isOpen: true })

const argument = (
  id: string,
  valueType: Extract<
    MebacoElement.Element,
    { kind: 'function-argument' }
  >['valueType'] = { type: 'number' },
  nullable = false,
) => node({ kind: 'function-argument', id, valueType, nullable })

const fn = (
  id: string,
  argumentNodes: TreeNode.Node[],
  procedureChildren: TreeNode.Node[],
  returnType: Extract<
    MebacoElement.Element,
    { kind: 'function' }
  >['returnType'] = {
    valueType: { type: 'number' }, nullable: false,
  },
  async = false,
) => node({ kind: 'function', id, async, returnType }, [
  node({ kind: 'function-arguments' }, argumentNodes),
  node({ kind: 'function-procedure' }, procedureChildren),
])

const project = (functions: TreeNode.Node[]) => node({ kind: 'project' }, [
  node({ kind: 'common' }, [
    node({ kind: 'declares' }, [
      node({ kind: 'types' }),
      node({ kind: 'functions' }),
    ]),
  ]),
  node({ kind: 'apps' }, [
    node({ kind: 'app', id: 'app' }, [
      node({ kind: 'declares' }, [
        node({ kind: 'types' }),
        node({ kind: 'functions' }, functions),
      ]),
    ]),
  ]),
])

describe('FunctionRunner', () => {
  it('executes Variables and Actions in order and evaluates Return', () => {
    nextNodeId = 1
    const calculate = fn('calculate', [argument('count')], [
      node({
        kind: 'variable', id: 'total', binding: 'let',
        typeSetting: { type: 'explicit', valueType: { type: 'number' }, nullable: false },
        source: '$args.count',
      }),
      node({ kind: 'action', comment: '', source: '$var.total *= 2' }),
      node({ kind: 'function-return', source: '$var.total' }),
    ])
    const root = project([calculate])

    expect(FunctionRunner.run(calculate, [3], FormulaContext.createEmpty(), root))
      .toEqual({ ok: true, value: 6 })
  })

  it('validates argument count, argument type, and Return type', () => {
    nextNodeId = 1
    const calculate = fn('calculate', [argument('count')], [
      node({ kind: 'function-return', source: "'wrong'" }),
    ])
    const root = project([calculate])

    expect(FunctionRunner.run(calculate, [], FormulaContext.createEmpty(), root))
      .toMatchObject({ ok: false, error: { message: expect.stringContaining('expects 1') } })
    expect(FunctionRunner.run(calculate, ['3'], FormulaContext.createEmpty(), root))
      .toMatchObject({ ok: false, error: { message: expect.stringContaining("Argument 'count'") } })
    expect(FunctionRunner.run(calculate, [3], FormulaContext.createEmpty(), root))
      .toMatchObject({ ok: false, error: { message: expect.stringContaining('incompatible') } })
  })

  it('supports calls through the typed Function namespace', () => {
    nextNodeId = 1
    const double = fn('double', [argument('value')], [
      node({ kind: 'function-return', source: '$args.value * 2' }),
    ])
    const quadruple = fn('quadruple', [argument('value')], [
      node({
        kind: 'function-return',
        source: '$function.double($function.double($args.value))',
      }),
    ])
    const root = project([double, quadruple])
    const appNode = root.children
      .find((child) => child.element.kind === 'apps')
      ?.children[0]
    const context = FormulaContext.createEmpty()
    context.$function = FunctionRunner.createNamespace(
      root,
      appNode?.id ?? root.id,
      context,
    )

    expect(context.$function.quadruple).toBeTypeOf('function')
    expect((context.$function.quadruple as (value: number) => number)(4)).toBe(16)
  })

  it('creates isolated local Variables for every call while retaining State effects', () => {
    nextNodeId = 1
    const increment = fn('increment', [], [
      node({
        kind: 'variable', id: 'local', binding: 'let',
        typeSetting: { type: 'inferred' }, source: '0',
      }),
      node({
        kind: 'action', comment: '',
        source: '$var.local += 1; $state.total += $var.local',
      }),
      node({ kind: 'function-return', source: '$var.local' }),
    ])
    const root = project([increment])
    const context = FormulaContext.create({ $state: { total: 0 } })

    expect(FunctionRunner.run(increment, [], context, root)).toEqual({ ok: true, value: 1 })
    expect(FunctionRunner.run(increment, [], context, root)).toEqual({ ok: true, value: 1 })
    expect(context.$state.total).toBe(2)
  })

  it('rejects Return statements inside an Action', () => {
    nextNodeId = 1
    const invalid = fn('invalid', [], [
      node({ kind: 'action', comment: '', source: 'return 1' }),
      node({ kind: 'function-return', source: '1' }),
    ])
    const root = project([invalid])

    expect(FunctionRunner.run(invalid, [], FormulaContext.createEmpty(), root))
      .toMatchObject({
        ok: false,
        error: { message: 'return is not allowed in an Action. Use the Function Return element.' },
      })
  })

  it('reports a missing runtime structure without traversing Procedure validation rules', () => {
    nextNodeId = 1
    const invalid = fn('invalid', [], [
      node({ kind: 'action', comment: '', source: '$state.executed = true' }),
    ])
    const root = project([invalid])
    const context = FormulaContext.create({ $state: { executed: false } })

    expect(FunctionRunner.run(invalid, [], context, root)).toMatchObject({
      ok: false,
      error: { message: 'Function \'invalid\' is not available for runtime execution.' },
    })
    expect(context.$state.executed).toBe(false)
  })

  it('does not rebind a Global Function to a caller local Variable frame', () => {
    nextNodeId = 1
    const readSecret = fn('readSecret', [], [
      node({ kind: 'function-return', source: '$var.secret' }),
    ])
    const localFunction = fn('localFunction', [], [
      node({ kind: 'function-return', source: '1' }),
    ])
    const retention = node({ kind: 'retention' }, [localFunction])
    const root = project([readSecret])
    const appNode = root.children
      .find((child) => child.element.kind === 'apps')
      ?.children[0]
    appNode?.children.push(retention)

    const appContext = FormulaContext.createEmpty()
    appContext.$function = FunctionRunner.createNamespace(
      root,
      appNode?.id ?? root.id,
      appContext,
    )
    const callerContext = FormulaContext.create({
      ...appContext,
      $var: { secret: 42 },
    })
    callerContext.$function = FunctionRunner.createNamespace(
      root,
      retention.id,
      callerContext,
    )

    expect(() => (
      callerContext.$function.readSecret as () => number
    )()).toThrow('returned an incompatible value')
  })

  it('supports nested Function closures over the parent invocation frame', () => {
    nextNodeId = 1
    const add = fn('add', [argument('amount')], [
      node({ kind: 'action', comment: '', source: '$var.total += $args.amount' }),
      node({ kind: 'function-return', source: '$var.total' }),
    ])
    const outer = fn('outer', [], [
      node({
        kind: 'variable', id: 'total', binding: 'let',
        typeSetting: { type: 'inferred' }, source: '1',
      }),
      add,
      node({ kind: 'action', comment: '', source: '$var.total = $function.add(2)' }),
      node({ kind: 'function-return', source: '$var.total' }),
    ])
    const root = project([outer])

    expect(FunctionRunner.run(outer, [], FormulaContext.createEmpty(), root))
      .toEqual({ ok: true, value: 3 })
    expect(FunctionRunner.run(outer, [], FormulaContext.createEmpty(), root))
      .toEqual({ ok: true, value: 3 })
  })

  it('lets a local Variable shadow a captured Variable', () => {
    nextNodeId = 1
    const calculate = fn('calculate', [], [
      node({
        kind: 'variable', id: 'factor', binding: 'let',
        typeSetting: { type: 'inferred' }, source: '1',
      }),
      node({ kind: 'action', comment: '', source: '$var.factor += 1' }),
      node({ kind: 'function-return', source: '$var.factor' }),
    ])
    const root = project([calculate])
    const outer = VariableFrame.create({})
    outer.declare('factor', 'let', 10)
    const context = FormulaContext.create({ $var: outer.values })

    expect(FunctionRunner.run(calculate, [], context, root)).toEqual({ ok: true, value: 2 })
    expect(outer.values.factor).toBe(10)
  })

  it('executes only the selected control Conditional branch', () => {
    nextNodeId = 1
    const conditional = node({ kind: 'control-conditional' }, [
      node({ kind: 'if', condition: '$args.enabled' }, [
        node({ kind: 'action', comment: '', source: '$state.result = 1' }),
      ]),
      node({ kind: 'else' }, [
        node({ kind: 'action', comment: '', source: '$state.result = 2' }),
      ]),
    ])
    const execute = fn('execute', [argument('enabled', { type: 'boolean' })], [
      conditional,
      node({ kind: 'function-return', source: '$state.result' }),
    ])
    const root = project([execute])
    const context = FormulaContext.create({ $state: { result: 0 } })

    expect(FunctionRunner.run(execute, [false], context, root))
      .toEqual({ ok: true, value: 2 })
    expect(context.$state.result).toBe(2)
  })

  it('executes the matching control Switch Case and falls back to Default', () => {
    nextNodeId = 1
    const switchNode = node({
      kind: 'control-switch',
      valueType: { type: 'primitive', primitive: 'number' },
      source: '$args.value',
    }, [
      node({ kind: 'case', value: { type: 'number', value: 1 } }, [
        node({ kind: 'action', comment: '', source: '$state.result = 10' }),
      ]),
      node({ kind: 'default' }, [
        node({ kind: 'action', comment: '', source: '$state.result = 20' }),
      ]),
    ])
    const execute = fn('execute', [argument('value')], [
      switchNode,
      node({ kind: 'function-return', source: '$state.result' }),
    ])
    const root = project([execute])

    const firstContext = FormulaContext.create({ $state: { result: 0 } })
    expect(FunctionRunner.run(execute, [1], firstContext, root))
      .toEqual({ ok: true, value: 10 })

    const defaultContext = FormulaContext.create({ $state: { result: 0 } })
    expect(FunctionRunner.run(execute, [2], defaultContext, root))
      .toEqual({ ok: true, value: 20 })
  })

  it('keeps captured const Variables readonly', () => {
    nextNodeId = 1
    const invalid = fn('invalid', [], [
      node({ kind: 'action', comment: '', source: '$var.factor = 2' }),
      node({ kind: 'function-return', source: '1' }),
    ])
    const root = project([invalid])
    const outer = VariableFrame.create({})
    outer.declare('factor', 'const', 1)

    expect(FunctionRunner.run(
      invalid,
      [],
      FormulaContext.create({ $var: outer.values }),
      root,
    )).toMatchObject({
      ok: false,
      error: { message: "Variable 'factor' is readonly." },
    })
  })

  it('executes async Actions and Return expressions in order', async () => {
    nextNodeId = 1
    const load = fn('load', [argument('value')], [
      node({
        kind: 'variable', id: 'result', binding: 'let',
        typeSetting: { type: 'inferred' }, source: '0',
      }),
      node({
        kind: 'action', comment: '',
        source: '$var.result = await $system.double($args.value)',
      }),
      node({
        kind: 'function-return',
        source: 'await $system.addOne($var.result)',
      }),
    ], { valueType: { type: 'number' }, nullable: false }, true)
    const root = project([load])
    const context = FormulaContext.create({
      $system: {
        getRef: () => null,
        afterRender: () => () => {},
        double: async (value: number) => value * 2,
        addOne: async (value: number) => value + 1,
      },
    })

    await expect(FunctionRunner.runAsync(load, [3], context, root))
      .resolves.toEqual({ ok: true, value: 7 })
  })

  it('returns a Promise namespace function and propagates rejected errors', async () => {
    nextNodeId = 1
    const fail = fn('fail', [], [
      node({ kind: 'action', comment: '', source: 'await $system.fail()' }),
      node({ kind: 'function-return', source: '1' }),
    ], { valueType: { type: 'number' }, nullable: false }, true)
    const root = project([fail])
    const appNode = root.children
      .find((child) => child.element.kind === 'apps')
      ?.children[0]
    const context = FormulaContext.create({
      $system: {
        getRef: () => null,
        afterRender: () => () => {},
        fail: async () => {
          throw new Error('network failed')
        },
      },
    })
    context.$function = FunctionRunner.createNamespace(
      root,
      appNode?.id ?? root.id,
      context,
    )

    const promise = (context.$function.fail as () => Promise<number>)()
    expect(promise).toBeInstanceOf(Promise)
    await expect(promise).rejects.toThrow('network failed')
  })

  it('isolates local frames across concurrent async calls', async () => {
    nextNodeId = 1
    const delayed = fn('delayed', [argument('value'), argument('delay')], [
      node({
        kind: 'variable', id: 'local', binding: 'let',
        typeSetting: { type: 'inferred' }, source: '$args.value',
      }),
      node({
        kind: 'action', comment: '',
        source: 'await $system.wait($args.delay); $var.local += 1',
      }),
      node({ kind: 'function-return', source: '$var.local' }),
    ], { valueType: { type: 'number' }, nullable: false }, true)
    const root = project([delayed])
    const context = FormulaContext.create({
      $system: {
        getRef: () => null,
        afterRender: () => () => {},
        wait: (delay: number) => new Promise((resolve) => setTimeout(resolve, delay)),
      },
    })

    const results = await Promise.all([
      FunctionRunner.runAsync(delayed, [10, 10], context, root),
      FunctionRunner.runAsync(delayed, [20, 1], context, root),
    ])
    expect(results).toEqual([
      { ok: true, value: 11 },
      { ok: true, value: 21 },
    ])
  })
})
