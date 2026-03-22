import type { Rules } from './types'
import { DEFAULT_RULES } from './types'

/**
 * Parse a Birth/Survival rule string into a Rules object.
 *
 * Accepted formats:
 *   "B3/S23"   → { birth: [3], survival: [2, 3] }
 *   "b36/s23"  → case-insensitive
 *   "B3S23"    → slash is optional
 *   "23/3"     → legacy "S/B" format (Golly outer-totalistic)
 *
 * Throws if the string cannot be parsed.
 */
export function parseRuleString(rule: string): Rules {
  const s = rule.trim()

  // Standard B.../S... format (slash optional, case-insensitive)
  const bsMatch = s.match(/^[Bb]([0-8]*)[\s/\\]*[Ss]([0-8]*)$/)
  if (bsMatch) {
    return {
      birth: digitsToArray(bsMatch[1] ?? ''),
      survival: digitsToArray(bsMatch[2] ?? ''),
    }
  }

  // Legacy S.../B... format
  const sbMatch = s.match(/^[Ss]([0-8]*)[\s/\\]*[Bb]([0-8]*)$/)
  if (sbMatch) {
    return {
      birth: digitsToArray(sbMatch[2] ?? ''),
      survival: digitsToArray(sbMatch[1] ?? ''),
    }
  }

  // Numeric-only "survival/birth" legacy format (e.g. "23/3")
  const numericMatch = s.match(/^([0-8]*)\/([0-8]*)$/)
  if (numericMatch) {
    return {
      birth: digitsToArray(numericMatch[2] ?? ''),
      survival: digitsToArray(numericMatch[1] ?? ''),
    }
  }

  throw new Error(`Invalid rule string: "${rule}"`)
}

/**
 * Serialise a Rules object to a canonical "B.../S..." string.
 *
 * Numbers are sorted and deduplicated.
 * Example: { birth: [3], survival: [2, 3] } → "B3/S23"
 */
export function ruleToString(rules: Rules): string {
  const b = [...new Set(rules.birth)].sort((a, b) => a - b).join('')
  const s = [...new Set(rules.survival)].sort((a, b) => a - b).join('')
  return `B${b}/S${s}`
}

/** Returns true when the two rule objects are equivalent. */
export function rulesEqual(a: Rules, b: Rules): boolean {
  return ruleToString(a) === ruleToString(b)
}

/** The canonical string for the default B3/S23 rules. */
export const DEFAULT_RULE_STRING = ruleToString(DEFAULT_RULES)

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function digitsToArray(digits: string): number[] {
  return digits === '' ? [] : [...new Set(digits.split('').map(Number))].sort((a, b) => a - b)
}
