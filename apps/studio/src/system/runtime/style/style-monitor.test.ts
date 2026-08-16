import { describe, expect, it } from 'vitest'
import type StyleResolver from './style-resolver'
import StyleMonitor from './style-monitor'

const declaration = (
  property: string,
  value: string,
  styleId: string,
  state: StyleResolver.Declaration['state'] = null,
): StyleResolver.Declaration => ({
  property,
  value,
  state,
  source: {
    styleId,
    path: [styleId],
    valueType: 'literal',
  },
})

describe('StyleMonitor', () => {
  it('keeps the final default declaration and its override history', () => {
    const result = StyleMonitor.create({
      declarations: [
        declaration('color', 'gray', 'base'),
        declaration('color', 'red', 'local'),
      ],
      errors: [],
    }, null)

    expect(result.entries).toHaveLength(1)
    expect(result.entries[0]?.value).toBe('red')
    expect(result.entries[0]?.source.styleId).toBe('local')
    expect(result.entries[0]?.overridden.map((item) => item.source.styleId)).toEqual(['base'])
  })

  it('combines default declarations with the selected state', () => {
    const result = StyleMonitor.create({
      declarations: [
        declaration('color', 'red', 'local'),
        declaration('width', '100px', 'base'),
        declaration('color', 'blue', 'base', 'hover'),
        declaration('opacity', '0.8', 'local', 'hover'),
      ],
      errors: [],
    }, 'hover')

    expect(result.entries.map(({ property, value }) => ({ property, value }))).toEqual([
      { property: 'color', value: 'blue' },
      { property: 'width', value: '100px' },
      { property: 'opacity', value: '0.8' },
    ])
    const color = result.entries.find((item) => item.property === 'color')
    expect(color?.overridden[0]?.state).toBeNull()
    expect(color?.state).toBe('hover')
  })

  it('normalizes standard properties while preserving custom-property case', () => {
    const result = StyleMonitor.create({
      declarations: [
        declaration('COLOR', 'red', 'base'),
        declaration('color', 'blue', 'local'),
        declaration('--Theme', 'one', 'base'),
        declaration('--theme', 'two', 'local'),
      ],
      errors: [],
    }, null)

    expect(result.entries).toHaveLength(3)
    expect(result.entries.find((item) => item.property === 'color')?.overridden).toHaveLength(1)
  })
})
