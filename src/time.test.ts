import { describe, it, expect } from 'vitest'
import { parseTimeRange } from './time'

const H = 3_600_000
const D = 86_400_000
const W = 7 * D
const MO = 30 * D

describe('parseTimeRange', () => {
  // valid — long form
  it('parses "6 hours"',  () => expect(parseTimeRange('6 hours')).toBe(6 * H))
  it('parses "2 days"',   () => expect(parseTimeRange('2 days')).toBe(2 * D))
  it('parses "3 weeks"',  () => expect(parseTimeRange('3 weeks')).toBe(3 * W))
  it('parses "1 month"',  () => expect(parseTimeRange('1 month')).toBe(1 * MO))
  it('parses "2 months"', () => expect(parseTimeRange('2 months')).toBe(2 * MO))

  // valid — short form
  it('parses "6h"',  () => expect(parseTimeRange('6h')).toBe(6 * H))
  it('parses "2d"',  () => expect(parseTimeRange('2d')).toBe(2 * D))
  it('parses "3w"',  () => expect(parseTimeRange('3w')).toBe(3 * W))
  it('parses "1mo"', () => expect(parseTimeRange('1mo')).toBe(1 * MO))

  // case + whitespace
  it('is case-insensitive',         () => expect(parseTimeRange('2 WEEKS')).toBe(2 * W))
  it('trims surrounding whitespace', () => expect(parseTimeRange('  3 days  ')).toBe(3 * D))
  it('allows multiple spaces between number and unit', () => expect(parseTimeRange('3  days')).toBe(3 * D))

  // singular
  it('parses "1 hour"', () => expect(parseTimeRange('1 hour')).toBe(1 * H))
  it('parses "1 day"',  () => expect(parseTimeRange('1 day')).toBe(1 * D))
  it('parses "1 week"', () => expect(parseTimeRange('1 week')).toBe(1 * W))

  // invalid
  it('returns null for empty string',   () => expect(parseTimeRange('')).toBeNull())
  it('returns null for unknown unit',   () => expect(parseTimeRange('5 years')).toBeNull())
  it('returns null for unit only',      () => expect(parseTimeRange('days')).toBeNull())
  it('returns null for zero',           () => expect(parseTimeRange('0 days')).toBeNull())
  it('returns null for decimal',        () => expect(parseTimeRange('1.5 days')).toBeNull())
  it('returns null for negative',       () => expect(parseTimeRange('-1 days')).toBeNull())
  it('returns null for missing space and no shorthand', () => expect(parseTimeRange('3days')).toBeNull())
})
