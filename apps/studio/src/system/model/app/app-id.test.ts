import { describe, expect, it } from 'vitest'
import AppId from './app-id'

describe('AppId', () => {
  it.each([
    ['my-app', 'myApp'],
    ['app-v2', 'appV2'],
    ['node32-editor', 'node32Editor'],
    ['api2-client', 'api2Client'],
  ])('creates a transition accessor from %s', (id, accessor) => {
    expect(AppId.toTransitionAccessor(id)).toBe(accessor)
  })

  it.each([
    'app-2',
    'my--app',
    'my-app-',
    '-my-app',
    'My-app',
  ])('rejects invalid App ID %s', (id) => {
    expect(AppId.isValid(id)).toBe(false)
    expect(() => AppId.toTransitionAccessor(id)).toThrow('Invalid App ID')
  })
})
