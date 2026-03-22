import { describe, it, expect } from 'vitest'
import { parseRuleString, ruleToString, rulesEqual, DEFAULT_RULE_STRING } from './rules'

describe('parseRuleString', () => {
  it('parses standard B3/S23 (Conway Life)', () => {
    expect(parseRuleString('B3/S23')).toEqual({ birth: [3], survival: [2, 3] })
  })

  it('parses HighLife B36/S23', () => {
    expect(parseRuleString('B36/S23')).toEqual({ birth: [3, 6], survival: [2, 3] })
  })

  it('is case-insensitive', () => {
    expect(parseRuleString('b3/s23')).toEqual({ birth: [3], survival: [2, 3] })
    expect(parseRuleString('B3/s23')).toEqual({ birth: [3], survival: [2, 3] })
  })

  it('handles slash-free format "B3S23"', () => {
    expect(parseRuleString('B3S23')).toEqual({ birth: [3], survival: [2, 3] })
  })

  it('handles legacy S/B numeric format "23/3"', () => {
    expect(parseRuleString('23/3')).toEqual({ birth: [3], survival: [2, 3] })
  })

  it('handles S.../B... format', () => {
    expect(parseRuleString('S23/B3')).toEqual({ birth: [3], survival: [2, 3] })
  })

  it('parses rules with empty birth list (e.g. no-birth)', () => {
    expect(parseRuleString('B/S23')).toEqual({ birth: [], survival: [2, 3] })
  })

  it('parses rules with empty survival list', () => {
    expect(parseRuleString('B3/S')).toEqual({ birth: [3], survival: [] })
  })

  it('deduplicates repeated digits', () => {
    expect(parseRuleString('B33/S223')).toEqual({ birth: [3], survival: [2, 3] })
  })

  it('sorts digit arrays in ascending order', () => {
    expect(parseRuleString('B63/S32')).toEqual({ birth: [3, 6], survival: [2, 3] })
  })

  it('throws for unrecognised format', () => {
    expect(() => parseRuleString('not-a-rule')).toThrow()
    expect(() => parseRuleString('')).toThrow()
    expect(() => parseRuleString('XYZ')).toThrow()
  })

  it('handles whitespace around the string', () => {
    expect(parseRuleString('  B3/S23  ')).toEqual({ birth: [3], survival: [2, 3] })
  })
})

describe('ruleToString', () => {
  it('serialises B3/S23 to "B3/S23"', () => {
    expect(ruleToString({ birth: [3], survival: [2, 3] })).toBe('B3/S23')
  })

  it('serialises HighLife to "B36/S23"', () => {
    expect(ruleToString({ birth: [3, 6], survival: [2, 3] })).toBe('B36/S23')
  })

  it('sorts digits in output', () => {
    expect(ruleToString({ birth: [6, 3], survival: [3, 2] })).toBe('B36/S23')
  })

  it('deduplicates digits in output', () => {
    expect(ruleToString({ birth: [3, 3], survival: [2, 3, 2] })).toBe('B3/S23')
  })

  it('handles empty arrays', () => {
    expect(ruleToString({ birth: [], survival: [] })).toBe('B/S')
  })
})

describe('rulesEqual', () => {
  it('returns true for identical rules', () => {
    expect(rulesEqual({ birth: [3], survival: [2, 3] }, { birth: [3], survival: [2, 3] })).toBe(
      true,
    )
  })

  it('returns true even when array order differs', () => {
    expect(
      rulesEqual({ birth: [6, 3], survival: [3, 2] }, { birth: [3, 6], survival: [2, 3] }),
    ).toBe(true)
  })

  it('returns false for different rules', () => {
    expect(rulesEqual({ birth: [3], survival: [2, 3] }, { birth: [3, 6], survival: [2, 3] })).toBe(
      false,
    )
  })
})

describe('DEFAULT_RULE_STRING', () => {
  it('equals "B3/S23"', () => {
    expect(DEFAULT_RULE_STRING).toBe('B3/S23')
  })
})

describe('round-trip', () => {
  const cases = ['B3/S23', 'B36/S23', 'B2/S', 'B/S12345678', 'B3678/S34678']

  for (const s of cases) {
    it(`round-trips "${s}"`, () => {
      expect(ruleToString(parseRuleString(s))).toBe(s)
    })
  }
})
