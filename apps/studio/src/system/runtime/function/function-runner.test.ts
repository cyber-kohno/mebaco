import { describe, expect, it } from 'vitest'
import type MebacoElement from '../../element/element'
import type TreeNode from '../../tree/tree-node'
import FormulaContext from '../formula/formula-context'
import FunctionRunner from './function-runner'
import VariableFrame from '../variable/variable-frame'
import SignatureDefinition from '../../element/kind/type/signature/signature-definition'
import type TypeExpression from '../../element/kind/type/type-expression'

let nextNodeId = 1
type FunctionElementValue = Extract<MebacoElement.Element, { kind: 'function' }>
const node = (
  element: MebacoElement.Element,
  children: TreeNode.Node[] = [],
): TreeNode.Node => ({ id: nextNodeId++, element, children, isOpen: true })

const argument = (
  id: string,
  valueType: TypeExpression.Expression = { type: 'number' },
  nullable = false,
) => SignatureDefinition.createParameter(
  id,
  valueType,
  nullable,
  `parameter-${nextNodeId++}`,
)

const inlineFunction = (
  id: string,
  definition: SignatureDefinition.Definition,
  implementation: FunctionElementValue['implementation'] = { mode: 'procedure' },
): FunctionElementValue => ({
  kind: 'function',
  id,
  signature: { mode: 'inline', definition },
  implementation,
})

const referFunction = (
  id: string,
  signatureTypeId: string,
): FunctionElementValue => ({
  kind: 'function',
  id,
  signature: { mode: 'refer', signatureTypeId },
  implementation: { mode: 'procedure' },
})

const fn = (
  id: string,
  argumentsList: SignatureDefinition.Parameter[],
  procedureChildren: TreeNode.Node[],
  returnType: SignatureDefinition.Definition['returnType'] = {
    valueType: { type: 'number' }, nullable: false,
  },
  async = false,
) => node(inlineFunction(
  id,
  SignatureDefinition.create(async, argumentsList, returnType),
), [
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
    node({ kind: 'app', appId: 'app-id', id: 'app' }, [
      node({ kind: 'declares' }, [
        node({ kind: 'types' }),
        node({ kind: 'functions' }, functions),
      ]),
    ]),
  ]),
])

describe('FunctionRunner', () => {
  it('executes a synchronous Code Function without Procedure children', () => {
    nextNodeId = 1
    const calculate = node(inlineFunction(
      'calculate',
      SignatureDefinition.create(
        false,
        [argument('value')],
        { valueType: { type: 'number' }, nullable: false },
      ),
      { mode: 'code', source: 'return value * 2' },
    ))
    const root = project([calculate])

    expect(FunctionRunner.run(calculate, [4], FormulaContext.createEmpty(), root))
      .toEqual({ ok: true, value: 8 })
  })

  it('executes an asynchronous Code Function', async () => {
    nextNodeId = 1
    const load = node(inlineFunction(
      'load',
      SignatureDefinition.create(
        true,
        [argument('value')],
        { valueType: { type: 'number' }, nullable: false },
      ),
      { mode: 'code', source: 'return await Promise.resolve(value * 2)' },
    ))
    const root = project([load])
    const context = FormulaContext.createEmpty()

    await expect(FunctionRunner.runAsync(load, [4], context, root))
      .resolves.toEqual({ ok: true, value: 8 })
  })

  it('executes a Refer Function with its Signature arguments and return type', () => {
    nextNodeId = 1
    const save = node(referFunction('save', 'save-signature'), [
      node({ kind: 'function-procedure' }, [
        node({ kind: 'function-return', source: '$args.value * 2' }),
      ]),
    ])
    const root = project([save])
    const typesNode = root.children[1]?.children[0]?.children[0]?.children
      .find((child) => child.element.kind === 'types')
    typesNode?.children.push(node({
      kind: 'signature-type', typeId: 'save-signature', id: 'SaveSignature',
      async: false,
      parameters: [{ parameterId: 'value-parameter-1', id: 'value', valueType: { type: 'number' }, nullable: false }],
      returnType: { valueType: { type: 'number' }, nullable: false },
    }))

    expect(FunctionRunner.run(save, [3], FormulaContext.createEmpty(), root))
      .toEqual({ ok: true, value: 6 })
    expect(FunctionRunner.run(save, ['3'], FormulaContext.createEmpty(), root))
      .toMatchObject({ ok: false, error: { message: expect.stringContaining("Argument 'value'") } })
  })

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

  it('accepts a callback through a Signature Value Type argument', () => {
    nextNodeId = 1
    const execute = fn('execute', [
      argument('handler', { type: 'named', namedTypeId: 'handler-type' }),
    ], [
      node({ kind: 'function-return', source: '$args.handler(3)' }),
    ])
    const root = project([execute])
    const typesNode = root.children[1]?.children[0]?.children[0]?.children
      .find((child) => child.element.kind === 'types')
    typesNode?.children.push(node({
      kind: 'signature-type',
      typeId: 'handler-type',
      id: 'Handler',
      async: false,
      parameters: [{ parameterId: 'value-parameter-2', id: 'value', valueType: { type: 'number' }, nullable: false }],
      returnType: { valueType: { type: 'number' }, nullable: false },
    }))

    expect(FunctionRunner.run(execute, [(value: number) => value * 2], FormulaContext.createEmpty(), root))
      .toEqual({ ok: true, value: 6 })
    expect(FunctionRunner.run(execute, ['not a function'], FormulaContext.createEmpty(), root))
      .toMatchObject({ ok: false, error: { message: expect.stringContaining("Argument 'handler'") } })
  })

  it('stores a local function in a Signature-typed Variable', () => {
    nextNodeId = 1
    const execute = fn('execute', [], [
      node({
        kind: 'variable',
        id: 'handler',
        binding: 'const',
        typeSetting: {
          type: 'explicit',
          valueType: { type: 'named', namedTypeId: 'handler-type' },
          nullable: false,
        },
        source: '(value) => value * 2',
      }),
      node({ kind: 'function-return', source: '$var.handler(4)' }),
    ])
    const root = project([execute])
    const typesNode = root.children[1]?.children[0]?.children[0]?.children
      .find((child) => child.element.kind === 'types')
    typesNode?.children.push(node({
      kind: 'signature-type',
      typeId: 'handler-type',
      id: 'Handler',
      async: false,
      parameters: [{ parameterId: 'value-parameter-3', id: 'value', valueType: { type: 'number' }, nullable: false }],
      returnType: { valueType: { type: 'number' }, nullable: false },
    }))

    expect(FunctionRunner.run(execute, [], FormulaContext.createEmpty(), root))
      .toEqual({ ok: true, value: 8 })
  })

  it('supports calls through the typed Function namespace', () => {
    nextNodeId = 1
    const double = fn('double', [argument('value')], [
      node({ kind: 'function-return', source: '$args.value * 2' }),
    ])
    const quadruple = fn('quadruple', [argument('value')], [
      node({
        kind: 'function-return',
        source: '$fn.double($fn.double($args.value))',
      }),
    ])
    const root = project([double, quadruple])
    const appNode = root.children
      .find((child) => child.element.kind === 'apps')
      ?.children[0]
    const context = FormulaContext.createEmpty()
    context.$fn = FunctionRunner.createNamespace(
      root,
      appNode?.id ?? root.id,
      context,
    )

    expect(context.$fn.quadruple).toBeTypeOf('function')
    expect((context.$fn.quadruple as (value: number) => number)(4)).toBe(16)
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

  it('reports a missing Return at runtime after executing the Procedure', () => {
    nextNodeId = 1
    const invalid = fn('invalid', [], [
      node({ kind: 'action', comment: '', source: '$state.executed = true' }),
    ])
    const root = project([invalid])
    const context = FormulaContext.create({ $state: { executed: false } })

    expect(FunctionRunner.run(invalid, [], context, root)).toMatchObject({
      ok: false,
      error: { message: "Function 'invalid' returned an incompatible value." },
    })
    expect(context.$state.executed).toBe(true)
  })

  it('allows a void Procedure to finish without Return', () => {
    nextNodeId = 1
    const execute = fn('execute', [], [
      node({ kind: 'action', comment: '', source: '$state.executed = true' }),
    ], null)
    const root = project([execute])
    const context = FormulaContext.create({ $state: { executed: false } })

    expect(FunctionRunner.run(execute, [], context, root))
      .toEqual({ ok: true, value: undefined })
    expect(context.$state.executed).toBe(true)
  })

  it('returns early from a selected Conditional branch', () => {
    nextNodeId = 1
    const conditional = node({ kind: 'control-conditional' }, [
      node({ kind: 'if', condition: '$args.early' }, [
        node({ kind: 'function-return', source: '1' }),
      ]),
    ])
    const execute = fn('execute', [argument('early', { type: 'boolean' })], [
      conditional,
      node({ kind: 'action', comment: '', source: '$state.continued = true' }),
      node({ kind: 'function-return', source: '2' }),
    ])
    const root = project([execute])

    const earlyContext = FormulaContext.create({ $state: { continued: false } })
    expect(FunctionRunner.run(execute, [true], earlyContext, root))
      .toEqual({ ok: true, value: 1 })
    expect(earlyContext.$state.continued).toBe(false)

    const continuedContext = FormulaContext.create({ $state: { continued: false } })
    expect(FunctionRunner.run(execute, [false], continuedContext, root))
      .toEqual({ ok: true, value: 2 })
    expect(continuedContext.$state.continued).toBe(true)
  })

  it('returns early from a nested Block', () => {
    nextNodeId = 1
    const execute = fn('execute', [], [
      node({ kind: 'block', label: 'guard' }, [
        node({ kind: 'function-return', source: '1' }),
      ]),
      node({ kind: 'function-return', source: '2' }),
    ])
    const root = project([execute])

    expect(FunctionRunner.run(execute, [], FormulaContext.createEmpty(), root))
      .toEqual({ ok: true, value: 1 })
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
    appContext.$fn = FunctionRunner.createNamespace(
      root,
      appNode?.id ?? root.id,
      appContext,
    )
    const callerContext = FormulaContext.create({
      ...appContext,
      $var: { secret: 42 },
    })
    callerContext.$fn = FunctionRunner.createNamespace(
      root,
      retention.id,
      callerContext,
    )

    expect(() => (
      callerContext.$fn.readSecret as () => number
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
      node({ kind: 'action', comment: '', source: '$var.total = $fn.add(2)' }),
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

  it('awaits an async Function result when initializing a Procedure Variable', async () => {
    nextNodeId = 1
    const load = fn('load', [argument('value')], [
      node({ kind: 'function-return', source: '$args.value * 2' }),
    ], { valueType: { type: 'number' }, nullable: false }, true)
    const consume = fn('consume', [argument('value')], [
      node({
        kind: 'variable', id: 'loaded', binding: 'const',
        typeSetting: {
          type: 'explicit', valueType: { type: 'number' }, nullable: false,
        },
        source: 'await $fn.load($args.value)',
      }),
      node({ kind: 'function-return', source: '$var.loaded + 1' }),
    ], { valueType: { type: 'number' }, nullable: false }, true)
    const root = project([load, consume])
    const appNode = root.children
      .find((child) => child.element.kind === 'apps')
      ?.children[0]
    const context = FormulaContext.createEmpty()
    context.$fn = FunctionRunner.createNamespace(
      root,
      appNode?.id ?? root.id,
      context,
    )

    await expect(FunctionRunner.runAsync(
      consume,
      [3],
      context,
      root,
    )).resolves.toEqual({ ok: true, value: 7 })
  })

  it('continues to reject await in an async Procedure control condition', async () => {
    nextNodeId = 1
    const conditional = node({ kind: 'control-conditional' }, [
      node({ kind: 'if', condition: 'await Promise.resolve(true)' }, [
        node({ kind: 'function-return', source: '1' }),
      ]),
    ])
    const execute = fn('execute', [], [
      conditional,
      node({ kind: 'function-return', source: '2' }),
    ], { valueType: { type: 'number' }, nullable: false }, true)
    const root = project([execute])

    await expect(FunctionRunner.runAsync(
      execute,
      [],
      FormulaContext.createEmpty(),
      root,
    )).resolves.toMatchObject({
      ok: false,
      error: { stage: 'compile' },
    })
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
    context.$fn = FunctionRunner.createNamespace(
      root,
      appNode?.id ?? root.id,
      context,
    )

    const promise = (context.$fn.fail as () => Promise<number>)()
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

  it('starts a Promise in a synchronous Procedure and runs Then after it returns', async () => {
    nextNodeId = 1
    let resolveSearch: (value: number) => void = () => {
      throw new Error('Search Promise was not started.')
    }
    const promise = node({
      kind: 'promise', id: 'result',
      resultType: { valueType: { type: 'number' }, nullable: false },
      source: '$system.search()',
    }, [
      node({ kind: 'promise-then' }, [
        node({
          kind: 'action', comment: '',
          source: '$state.result = $var.result; $var.local += 1',
        }),
      ]),
    ])
    const search = fn('search', [], [
      node({
        kind: 'variable', id: 'local', binding: 'let',
        typeSetting: { type: 'inferred' }, source: '1',
      }),
      promise,
      node({ kind: 'action', comment: '', source: '$state.afterStart = true' }),
    ], null)
    const root = project([search])
    let renderRequests = 0
    const context = FormulaContext.create({
      $state: { afterStart: false, result: 0 },
      $system: {
        getRef: () => null,
        afterRender: () => () => {},
        search: () => new Promise<number>((resolve) => { resolveSearch = resolve }),
      },
      requestRender: () => { renderRequests += 1 },
    })

    expect(FunctionRunner.run(search, [], context, root))
      .toEqual({ ok: true, value: undefined })
    expect(context.$state).toMatchObject({ afterStart: true, result: 0 })

    resolveSearch(42)
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(context.$state.result).toBe(42)
    expect(renderRequests).toBe(1)
  })

  it('runs Catch for a rejected Promise and reports an unhandled rejection', async () => {
    nextNodeId = 1
    const handledPromise = node({
      kind: 'promise', id: '', resultType: null, source: '$system.fail()',
    }, [
      node({ kind: 'promise-then' }),
      node({ kind: 'promise-catch', id: 'error' }, [
        node({
          kind: 'action', comment: '',
          source: '$state.message = $var.error.message',
        }),
      ]),
    ])
    const unhandledPromise = node({
      kind: 'promise', id: '', resultType: null, source: '$system.fail()',
    }, [node({ kind: 'promise-then' })])
    const handled = fn('handled', [], [handledPromise], null)
    const unhandled = fn('unhandled', [], [unhandledPromise], null)
    const root = project([handled, unhandled])
    const reports: Array<{ nodeId: number; message: string }> = []
    const context = FormulaContext.create({
      $state: { message: '' },
      $system: {
        getRef: () => null,
        afterRender: () => () => {},
        fail: () => Promise.reject(new Error('search failed')),
      },
      reportError: (nodeId, error) => reports.push({ nodeId, message: error.message }),
    })

    expect(FunctionRunner.run(handled, [], context, root)).toEqual({ ok: true, value: undefined })
    expect(FunctionRunner.run(unhandled, [], context, root)).toEqual({ ok: true, value: undefined })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(context.$state.message).toBe('search failed')
    expect(reports).toEqual([{ nodeId: unhandledPromise.id, message: 'search failed' }])
  })
})
