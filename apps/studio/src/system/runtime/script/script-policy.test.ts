import { describe, expect, it } from 'vitest'
import ScriptPolicy from './script-policy'

describe('ScriptPolicy', () => {
  it('rejects await outside an async Function', () => {
    expect(ScriptPolicy.validate('await $fn.load()', { allowAwait: false }))
      .toContain('await is only available in an async Function.')
    expect(ScriptPolicy.validate('await $fn.load()', { allowAwait: true }))
      .toEqual([])
  })

  it('rejects Return statements in Action source without matching comments', () => {
    expect(ScriptPolicy.validate('return $var.value', { forbidReturn: true }))
      .toContain('return is not allowed in an Action. Use the Function Return element.')
    expect(ScriptPolicy.validate('// return is documented', { forbidReturn: true }))
      .toEqual([])
  })
})
