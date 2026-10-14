import { describe, expect, it } from "vitest"
import { isPreviewableLinkCode, linkFailureMessage, LINK_NO_MATCH_MESSAGE, normalizeLinkCode } from "./linkCode"
import { clientIpFrom, computeClientKey } from "@/app/supaApi/server/clientKey"

describe("normalizeLinkCode (mirrors public.normalize_link_code)", () => {
  it("ignores case, spaces and hyphens", () => {
    expect(normalizeLinkCode(" ab-cd ef ")).toBe("ABCDEF")
  })
  it("reads I and L as 1 and O as 0", () => {
    expect(normalizeLinkCode("ilo")).toBe("110")
  })
  it("leaves legacy hex codes unchanged apart from case", () => {
    expect(normalizeLinkCode("3fa9c0e")).toBe("3FA9C0E")
  })
})

describe("isPreviewableLinkCode", () => {
  it("accepts 10 Crockford characters", () => {
    expect(isPreviewableLinkCode("7K2M-9QXT-4R")).toBe(true)
  })
  it("refuses legacy 7-character codes, so they never reach the preview RPC", () => {
    expect(isPreviewableLinkCode("3fa9c0e")).toBe(false)
  })
  it("refuses characters outside the alphabet", () => {
    expect(isPreviewableLinkCode("UUUUUUUUUU")).toBe(false)
  })
})

describe("linkFailureMessage", () => {
  it("never echoes input and uses one message for every no-match", () => {
    expect(linkFailureMessage("no_match")).toBe(LINK_NO_MATCH_MESSAGE)
    expect(linkFailureMessage("rate_limited")).not.toBe(LINK_NO_MATCH_MESSAGE)
  })
})

describe("client key", () => {
  it("is a 64-character keyed digest, not the address", () => {
    const key = computeClientKey("x".repeat(32), "203.0.113.7")
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(key).not.toContain("203")
    expect(computeClientKey("y".repeat(32), "203.0.113.7")).not.toBe(key)
  })
  it("takes the first forwarded hop, then x-real-ip, then a shared bucket", () => {
    expect(clientIpFrom("203.0.113.7, 10.0.0.1", "1.1.1.1")).toBe("203.0.113.7")
    expect(clientIpFrom(null, " 1.1.1.1 ")).toBe("1.1.1.1")
    expect(clientIpFrom(null, null)).toBe("unknown")
  })
})
