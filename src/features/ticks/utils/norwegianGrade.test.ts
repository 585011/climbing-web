import { describe, it, expect } from 'vitest'
import { parseNorwegianGrade, compareNorwegianGrades } from './norwegianGrade'

describe('parseNorwegianGrade', () => {
  it('parses plain, plus and minus grades', () => {
    expect(parseNorwegianGrade('6')).not.toBeNull()
    expect(parseNorwegianGrade('6-')).not.toBeNull()
    expect(parseNorwegianGrade('6+')).not.toBeNull()
    expect(parseNorwegianGrade('1')).not.toBeNull()
    expect(parseNorwegianGrade(' 9+ ')).not.toBeNull() // tolerates whitespace
  })

  it('orders ranks correctly: 5+ < 6- < 6 < 6+ < 7-', () => {
    const ranks = ['5+', '6-', '6', '6+', '7-'].map(g => parseNorwegianGrade(g)!)
    const sorted = [...ranks].sort((a, b) => a - b)
    expect(ranks).toEqual(sorted)
    expect(new Set(ranks).size).toBe(5) // all distinct
  })

  it('rejects non-Norwegian grades', () => {
    for (const bad of ['6a', '6b+', '10', '0', '', '6++', '+6', 'abc']) {
      expect(parseNorwegianGrade(bad)).toBeNull()
    }
  })
})

describe('compareNorwegianGrades', () => {
  it('sorts hardest first with unparseable grades last', () => {
    const grades = ['6', '', '7-', '6a', '6+']
    const sorted = [...grades].sort(compareNorwegianGrades)
    expect(sorted.slice(0, 3)).toEqual(['7-', '6+', '6'])
    expect(sorted.slice(3)).toEqual(expect.arrayContaining(['', '6a']))
  })
})
