import { encodeRle, decodeRle } from './rle'
import type { Cell } from '../engine/types'

const HASH_PREFIX = 'p='

/**
 * Encode an array of live cells into a URL hash fragment.
 * The pattern is serialised as RLE, base64url-encoded, and prefixed with `#p=`.
 */
export function encodePatternToHash(cells: Cell[]): string {
  const rle = encodeRle(cells)
  // base64url: replace + → -, / → _, strip trailing =
  const encoded = btoa(rle).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `#${HASH_PREFIX}${encoded}`
}

/**
 * Decode a URL hash fragment produced by `encodePatternToHash`.
 * Returns the live cells, or `null` if the hash is absent, malformed, or
 * uses an unrecognised format.
 */
export function decodePatternFromHash(hash: string): Cell[] | null {
  if (!hash || !hash.startsWith('#')) return null
  const fragment = hash.slice(1)
  if (!fragment.startsWith(HASH_PREFIX)) return null
  const encoded = fragment.slice(HASH_PREFIX.length)
  if (!encoded) return null
  try {
    // Restore standard base64 padding
    const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64 + '=='.slice(0, (4 - (base64.length % 4)) % 4)
    const rle = atob(padded)
    return decodeRle(rle)
  } catch {
    return null
  }
}
