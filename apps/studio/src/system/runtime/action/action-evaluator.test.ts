import { describe, expect, it, vi } from 'vitest'
import FormulaContext from '../formula/formula-context'
import FormulaEvaluator from '../formula/formula-evaluator'
import ActionEvaluator from './action-evaluator'

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
})
