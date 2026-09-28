import { describe, expect, it } from 'vitest'
import ScriptPolicy from './script-policy'

describe('ScriptPolicy', () => {
  it('rejects await outside an async Function', () => {
    expect(ScriptPolicy.validate('await $fn.load()', { allowAwait: false }))
      .toContain('await is only available in an async Function.')
    expect(ScriptPolicy.validate('await $fn.load()', { allowAwait: true }))
      .toEqual([])
  })

  it('allows void early returns but rejects value returns in Action source', () => {
    expect(ScriptPolicy.validate('if ($state.ready) return;', {
      allowVoidReturn: true,
      forbidReturn: true,
    })).toEqual([])
    expect(ScriptPolicy.validate('return $var.value', { forbidReturn: true }))
      .toContain('A value-returning return is not allowed in an Action. Use return; to exit the current Action, or the Function Return element to return from the enclosing Function.')
    expect(ScriptPolicy.validate('return;', { forbidReturn: true }))
      .toContain('return is not allowed in an Action. Use the Function Return element.')
    expect(ScriptPolicy.validate('// return is documented', { forbidReturn: true }))
      .toEqual([])
  })

  it('does not treat returns inside nested JavaScript functions as Action returns', () => {
    expect(ScriptPolicy.validate(
      '[1].map((value) => { return value })',
      { allowVoidReturn: true, forbidReturn: true },
    )).toEqual([])
  })

  it('reports browser globals that are not provided by the script runtime', () => {
    expect(ScriptPolicy.validate('document.body'))
      .toEqual(['Mebaco script runtime does not provide document.'])
    expect(ScriptPolicy.validate('$state.document'))
      .toEqual([])
  })
})
