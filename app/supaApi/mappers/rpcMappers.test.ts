import { describe, expect, it } from "vitest"
import { leaderNoticeSentence, mapLeaderGroupLetters, mapOwnLedLetters, mapPointsToNext } from "./rpcMappers"

describe("mapPointsToNext", () => {
  it("splits cohorts and drops non-positive gaps", () => {
    const out = mapPointsToNext([
      { cohort_kind: "overall", cohort_id: null as unknown as number, points_to_next: 12 },
      { cohort_kind: "grade", cohort_id: 7, points_to_next: 3 },
      { cohort_kind: "point_group", cohort_id: 4, points_to_next: 5 },
      { cohort_kind: "student_group", cohort_id: 9, points_to_next: 0 },
    ])
    expect(out).toEqual({ overall: 12, grade: 3, pointGroups: [{ pointGroupId: 4, pointsToNext: 5 }], studentGroups: [] })
  })
  it("is all-empty for an unranked or first-place student (no rows)", () => {
    expect(mapPointsToNext([])).toEqual({ overall: null, grade: null, pointGroups: [], studentGroups: [] })
  })
})

describe("mapLeaderGroupLetters", () => {
  const row = (ordinal: number, pg: number, letter: string | null) => ({
    group_id: 3, group_name: "Band", member_first_name: `F${ordinal}`, member_last_name: `L${ordinal}`,
    member_ordinal: ordinal, point_group_id: pg, point_group_name: `PG${pg}`, point_group_color: "#000", letter: letter as string,
  })
  it("groups rows into members with opaque keys and keeps server order", () => {
    const [g] = mapLeaderGroupLetters([row(1, 10, "A"), row(1, 11, null), row(2, 10, "E"), row(2, 11, null)])
    expect(g.pointGroups.map(p => p.id)).toEqual([10, 11])
    expect(g.members.map(m => m.key)).toEqual(["3:1", "3:2"])
    expect(g.members[1].letters).toEqual([{ pointGroupId: 10, letter: "E" }, { pointGroupId: 11, letter: null }])
    expect(JSON.stringify(g)).not.toMatch(/student_?id/i)
  })
  it("treats anything outside S..E as hidden", () => {
    const [g] = mapLeaderGroupLetters([row(1, 10, "F")])
    expect(g.members[0].letters[0].letter).toBeNull()
  })
})

describe("mapOwnLedLetters and the L10 sentence", () => {
  const rows = [{
    group_id: 3, group_name: "Band",
    leaders: [{ firstName: "Ana", lastInitial: "B" }, { firstName: "Leo", lastInitial: "C" }],
    letters: [{ pointGroupId: 10, letter: "B" }, { pointGroupId: 99, letter: "A" }],
  }]
  it("keeps only own-school categories and names them", () => {
    const [g] = mapOwnLedLetters(rows, new Map([[10, "Music"]]))
    expect(g.letters).toEqual([{ pointGroupId: 10, pointGroupName: "Music", letter: "B" }])
  })
  it("names every leader", () => {
    const [g] = mapOwnLedLetters(rows, new Map())
    expect(leaderNoticeSentence(g, "your")).toBe("Ana B. and Leo C., who lead Band, can see your letter grade (S, or A to E) for each category.")
    expect(leaderNoticeSentence({ ...g, leaders: [g.leaders[0]] }, { possessive: "Maya's" }))
      .toBe("Ana B., who leads Band, can see Maya's letter grade (S, or A to E) for each category.")
  })
})
