import { beforeEach, describe, expect, it, vi } from "vitest"

const viewer = vi.fn()
vi.mock("../display/displayAccess", () => ({ getDashboardViewer: () => viewer() }))
vi.mock("../supabaseServiceClient", () => ({
  default: async () => ({
    from: () => ({
      select: () => ({
        in: async (_col: string, ids: number[]) => ({ data: ids.map((id) => ({ id, name: `School ${id}` })), error: null }),
      }),
    }),
  }),
}))

import { getDashboardSchoolId, getDashboardSchools, getDashboardViewerSummary } from "./dashboardSchool"

const display = { kind: "display", deviceId: "d", schoolId: 4, schoolName: "Lincoln", label: "Hall", pairedByName: "Ms. A" }

describe("dashboard school resolution", () => {
  beforeEach(() => viewer.mockReset())

  it("pins a display to its own school whatever the browser asks for", async () => {
    viewer.mockResolvedValue(display)
    expect(await getDashboardSchoolId(9)).toBe(4)
    expect(await getDashboardSchools()).toEqual([{ id: 4, name: "Lincoln" }])
  })

  it("never returns the device id in the viewer summary", async () => {
    viewer.mockResolvedValue(display)
    const summary = await getDashboardViewerSummary()
    expect(summary).toEqual({ kind: "display", schoolName: "Lincoln", label: "Hall", pairedByName: "Ms. A" })
    expect(JSON.stringify(summary)).not.toContain("deviceId")
  })

  it("lets staff choose only among their own schools", async () => {
    viewer.mockResolvedValue({ kind: "staff", userId: 1, schoolIds: [7, 3] })
    expect(await getDashboardSchoolId(7)).toBe(7)
    expect(await getDashboardSchoolId(9)).toBe(3)
    expect((await getDashboardSchools()).map((s) => s.id)).toEqual([3, 7])
  })

  it("returns nothing without a viewer", async () => {
    viewer.mockResolvedValue(null)
    expect(await getDashboardSchoolId(1)).toBeNull()
    expect(await getDashboardSchools()).toEqual([])
    expect(await getDashboardViewerSummary()).toBeNull()
  })
})
