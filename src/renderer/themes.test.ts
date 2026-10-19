import { describe, it, expect } from 'vitest'
import { DARK_THEME_COLORS, LIGHT_THEME_COLORS, THEME_COLORS } from './themes'

describe('DARK_THEME_COLORS', () => {
  it('has white cells', () => {
    expect(DARK_THEME_COLORS.cellColor).toEqual([1, 1, 1, 1])
  })

  it('has black background', () => {
    expect(DARK_THEME_COLORS.backgroundColor).toEqual([0, 0, 0, 1])
  })

  it('has a mid-gray grid', () => {
    const [r, g, b, a] = DARK_THEME_COLORS.gridColor
    expect(r).toBeGreaterThan(0)
    expect(r).toBeLessThan(1)
    expect(r).toBe(g)
    expect(g).toBe(b)
    expect(a).toBe(1)
  })
})

describe('LIGHT_THEME_COLORS', () => {
  it('has near-black cells', () => {
    const [r, g, b, a] = LIGHT_THEME_COLORS.cellColor
    expect(r).toBeLessThan(0.5)
    expect(r).toBe(g)
    expect(g).toBe(b)
    expect(a).toBe(1)
  })

  it('has white background', () => {
    expect(LIGHT_THEME_COLORS.backgroundColor).toEqual([1, 1, 1, 1])
  })

  it('has a light grid', () => {
    const [r, , , a] = LIGHT_THEME_COLORS.gridColor
    expect(r).toBeGreaterThan(0.5)
    expect(a).toBe(1)
  })
})

describe('THEME_COLORS', () => {
  it('maps dark to DARK_THEME_COLORS', () => {
    expect(THEME_COLORS.dark).toBe(DARK_THEME_COLORS)
  })

  it('maps light to LIGHT_THEME_COLORS', () => {
    expect(THEME_COLORS.light).toBe(LIGHT_THEME_COLORS)
  })

  it('dark and light backgrounds are distinct', () => {
    expect(THEME_COLORS.dark.backgroundColor).not.toEqual(THEME_COLORS.light.backgroundColor)
  })

  it('dark and light cell colors are distinct', () => {
    expect(THEME_COLORS.dark.cellColor).not.toEqual(THEME_COLORS.light.cellColor)
  })
})
