/**
 * Norwegian sport-climbing grades: an integer 1-9 with an optional
 * `-` or `+` suffix. Ordering: 6- < 6 < 6+ < 7-. This app does NOT
 * use French grades (6a/6b+), despite older wireframes showing them.
 */
const GRADE_RE = /^([1-9])([+-]?)$/

/** Comparable rank for a grade, or null when the string isn't a Norwegian grade. */
export const parseNorwegianGrade = (grade: string): number | null => {
  const m = GRADE_RE.exec(grade.trim())
  if (!m) return null
  const base = Number(m[1]) * 3
  if (m[2] === '-') return base - 1
  if (m[2] === '+') return base + 1
  return base
}

/** Sort comparator: hardest grade first; unparseable grades last. */
export const compareNorwegianGrades = (a: string, b: string): number => {
  const ra = parseNorwegianGrade(a)
  const rb = parseNorwegianGrade(b)
  if (ra === null && rb === null) return 0
  if (ra === null) return 1
  if (rb === null) return -1
  return rb - ra
}
