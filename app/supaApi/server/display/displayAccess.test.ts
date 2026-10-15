import { describe, expect, it } from "vitest"
import { byteaDigest, mintSecret } from "./displayAccess"
import { overLimit } from "../memoryRateLimit"
import { cohortKey } from "../dashboard/displayCut"

describe("display credentials", () => {
  it("mints 256-bit secrets", () => {
    const a = mintSecret()
    expect(Buffer.from(a, "base64url")).toHaveLength(32)
    expect(mintSecret()).not.toBe(a)
  })
  it("sends only a 32-byte SHA-256 as a bytea hex literal", () => {
    const digest = byteaDigest("token")
    expect(digest).toMatch(/^\\x[0-9a-f]{64}$/)
    expect(digest).not.toContain("token")
  })
})

describe("overLimit", () => {
  it("allows `limit` hits per window, then refuses until the window resets", () => {
    const key = `test:${Math.random()}`
    for (let i = 0; i < 3; i++) expect(overLimit(key, 3, 1000, 0)).toBe(false)
    expect(overLimit(key, 3, 1000, 10)).toBe(true)
    expect(overLimit(key, 3, 1000, 1000)).toBe(false)
  })
})

describe("cohortKey", () => {
  it("never contains a student id", () => {
    expect(cohortKey({ kind: "overall" })).toBe("overall")
    expect(cohortKey({ kind: "grade", grade: 7 })).toBe("grade-7")
    expect(cohortKey({ kind: "pointGroup", pointGroupId: 3 })).toBe("pg-3")
    expect(cohortKey({ kind: "studentGroup", studentGroupId: 9 })).toBe("sg-9")
  })
})
