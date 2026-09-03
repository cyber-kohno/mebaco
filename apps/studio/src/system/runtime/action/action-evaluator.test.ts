import { describe, expect, it, vi } from 'vitest'
import FormulaContext from '../formula/formula-context'
import FormulaEvaluator from '../formula/formula-evaluator'
import ActionEvaluator from './action-evaluator'
import RuntimeLog from '../log/runtime-log'

describe('ActionEvaluator transition scope', () => {
  it('exposes the transition namespace to Actions', () => {
    const transition = vi.fn()
    const context = FormulaContext.create({
      $transition: { userDetail: transition },
    })

    expect(ActionEvaluator.executeScript(
      '$transition.userDetail({ id: 1 })',
      context,
    ).ok).toBe(true)
    expect(transition).toHaveBeenCalledWith({ id: 1 })
  })

  it('does not expose the transition namespace to expressions', () => {
    const context = FormulaContext.create({
      $transition: { userDetail: vi.fn() },
    })

    const result = FormulaEvaluator.evaluateExpression(
      '$transition.userDetail({ id: 1 })',
      context,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('$transition is not defined')
  })

  it('exposes Resource promises to synchronous Actions', async () => {
    const state: Record<string, unknown> = {}
    const read = vi.fn().mockResolvedValue('settings')
    const context = FormulaContext.create({
      $state: state,
      $resource: { settings: { read } },
    })

    const result = ActionEvaluator.executeScript(
      "$resource.settings.read().then((text) => { $state.value = text })",
      context,
    )

    expect(result.ok).toBe(true)
    expect(read).toHaveBeenCalledOnce()
    await Promise.resolve()
    expect(state.value).toBe('settings')
  })

  it('does not expose the Resource namespace to expressions', () => {
    const context = FormulaContext.create({
      $resource: { settings: { read: vi.fn() } },
    })

    const result = FormulaEvaluator.evaluateExpression(
      '$resource.settings',
      context,
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message).toContain('$resource is not defined')
  })

  it('exposes a node-bound Log namespace to Actions but not expressions', () => {
    const info = vi.fn()
    const root = {
      id: 1,
      element: { kind: 'project' as const },
      isOpen: true,
      children: [],
    }
    const context = FormulaContext.create({
      logSession: RuntimeLog.create(root, {
        sink: { debug: vi.fn(), info, warn: vi.fn(), error: vi.fn() },
      }),
    })

    const actionResult = ActionEvaluator.executeScript(
      '$log.info("action")',
      FormulaContext.forNode(context, 27),
    )
    const expressionResult = FormulaEvaluator.evaluateExpression(
      '$log.info("expression")',
      FormulaContext.forNode(context, 28),
    )

    expect(actionResult.ok).toBe(true)
    expect(info).toHaveBeenCalledOnce()
    expect(String(info.mock.calls[0][0][0])).toContain('[node-27]')
    expect(expressionResult.ok).toBe(false)
    if (!expressionResult.ok) expect(expressionResult.message).toContain('$log is not defined')
  })
})
