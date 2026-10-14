import { describe, expect, it } from "vitest"
import { gradeCut, isRankWithin, isStudentPublished } from "./publicationCut"

const limits = { overall: 10, perPointGroup: 10, gradeRatio: 0.33 }
const sizes = new Map<number, number>([[5, 30]])

describe("isRankWithin", () => {
  it("accepts real ranks inside the limit", () => {
    expect(isRankWithin(1, 10)).toBe(true)
    expect(isRankWithin(10, 10)).toBe(true)
  })

  it("rejects ranks outside the limit", () => {
    expect(isRankWithin(11, 10)).toBe(false)
  })

  it("fails closed for missing, zero, negative, and non-finite ranks", () => {
    expect(isRankWithin(undefined, 10)).toBe(false)
    expect(isRankWithin(null, 10)).toBe(false)
    expect(isRankWithin(0, 10)).toBe(false)
    expect(isRankWithin(-1, 10)).toBe(false)
    expect(isRankWithin(NaN, 10)).toBe(false)
  })
})

describe("gradeCut", () => {
  it("floors and keeps a hidden remainder", () => {
    expect(gradeCut(30, 0.33)).toBe(9)
    expect(gradeCut(9, 0.33)).toBe(2)
    expect(gradeCut(4, 0.33)).toBe(1)
    expect(gradeCut(3, 0.33)).toBe(0)
    expect(gradeCut(2, 0.33)).toBe(0)
  })

  it("is zero for an unknown or invalid cohort size", () => {
    expect(gradeCut(undefined, 0.33)).toBe(0)
    expect(gradeCut(NaN, 0.33)).toBe(0)
  })
})

describe("isStudentPublished", () => {
  it("does not publish a student missing from every rank map (rank 0)", () => {
    const student = { rank: 0, grade: 5, gradeRank: 0, pointGroups: [{ rank: 0 }, { rank: 0 }] }
    expect(isStudentPublished(student, sizes, limits)).toBe(false)
  })

  it("does not publish via a point group the student is missing from", () => {
    const student = { rank: 50, grade: 5, gradeRank: 25, pointGroups: [{ rank: 0 }, { rank: 40 }] }
    expect(isStudentPublished(student, sizes, limits)).toBe(false)
  })

  it("does not publish a student whose grade size is unknown", () => {
    const student = { rank: 50, grade: 9, gradeRank: 1, pointGroups: [] }
    expect(isStudentPublished(student, sizes, limits)).toBe(false)
  })

  it("publishes a student above the cut in a point group", () => {
    const student = { rank: 50, grade: 5, gradeRank: 25, pointGroups: [{ rank: 0 }, { rank: 3 }] }
    expect(isStudentPublished(student, sizes, limits)).toBe(true)
  })

  it("publishes a student within the overall cut", () => {
    const student = { rank: 2, grade: 5, gradeRank: 25, pointGroups: [] }
    expect(isStudentPublished(student, sizes, limits)).toBe(true)
  })
})
