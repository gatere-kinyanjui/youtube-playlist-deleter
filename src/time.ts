const MS_PER: Record<string, number> = {
  h: 3_600_000,
  hour: 3_600_000,
  hours: 3_600_000,
  d: 86_400_000,
  day: 86_400_000,
  days: 86_400_000,
  w: 7 * 86_400_000,
  week: 7 * 86_400_000,
  weeks: 7 * 86_400_000,
  mo: 30 * 86_400_000,
  month: 30 * 86_400_000,
  months: 30 * 86_400_000,
}

export function parseTimeRange(input: string): number | null {
  const match = input
    .trim()
    .toLowerCase()
    .match(/^(\d+)(?:\s+(h|hour|hours|d|day|days|w|week|weeks|mo|month|months)|([hd]|w|mo))$/)
  if (!match) return null
  const n = parseInt(match[1], 10)
  if (n <= 0) return null
  const unit = match[2] || match[3]
  const ms = MS_PER[unit]
  return ms !== undefined ? n * ms : null
}
