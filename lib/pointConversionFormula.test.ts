import { describe, expect, it } from "vitest"
import { evaluatePointConversionFormula, validatePointConversionFormula } from "./pointConversionFormula"

describe("point conversion formulas", () => {
  it("uses the raw input when no formula is configured", () => {
    expect(evaluatePointConversionFormula(null, 30)).toBe(30)
  })

  it("evaluates arithmetic with precedence and parentheses", () => {
    expect(evaluatePointConversionFormula("x*2", 30)).toBe(60)
    expect(evaluatePointConversionFormula("(x+5)*2", 10)).toBe(30)
    expect(evaluatePointConversionFormula("x^2-4", 5)).toBe(21)
  })

  it("rejects invalid syntax and formulas without x", () => {
    expect(validatePointConversionFormula("x**2").valid).toBe(false)
    expect(validatePointConversionFormula("30*2").valid).toBe(false)
  })

  it("rounds fractional results to the nearest whole point", () => {
    expect(evaluatePointConversionFormula("x/2", 3)).toBe(2)
    expect(evaluatePointConversionFormula("x/2", 2)).toBe(1)
  })

  it("rejects non-integer inputs and invalid arithmetic", () => {
    expect(() => evaluatePointConversionFormula("x*2", 1.5)).toThrow("whole number")
    expect(() => evaluatePointConversionFormula("x/(x-x)", 3)).toThrow("Division by zero")
  })

  it("validates syntax separately from input-specific arithmetic", () => {
    expect(validatePointConversionFormula("10/x")).toEqual({ valid: true })
    expect(() => evaluatePointConversionFormula("10/x", 0)).toThrow("Division by zero")
  })
})
