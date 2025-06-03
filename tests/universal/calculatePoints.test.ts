import { describe, it, expect } from 'vitest'
import { calculatePoints } from '@/app/supaApi/universal/utils/calculatePoints'
import {
  convertPointUsingRuleType,
  PointConversionRuleType,
} from '@/app/dataClasses'

// Using calculatePoints utility function

describe('calculatePoints', () => {
  it('handles add rule', () => {
    expect(calculatePoints('add', 5, 3)).toBe(8)
  })

  it('handles subtract rule', () => {
    expect(calculatePoints('subtract', 5, 3)).toBe(2)
  })

  it('handles multiply rule', () => {
    expect(calculatePoints('multiply', 5, 3)).toBe(15)
  })

  it('handles divide rule', () => {
    expect(calculatePoints('divide', 6, 3)).toBe(2)
  })

  it('handles direct rule', () => {
    expect(calculatePoints('direct', 7, 10)).toBe(7)
  })

  it('handles formula rule', () => {
    const result = convertPointUsingRuleType(
      PointConversionRuleType.FORMULA,
      0,
      0,
      '3 + 4'
    )
    expect(result).toBe(7)
  })
})
