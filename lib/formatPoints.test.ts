import { describe, expect, it } from "vitest";
import { formatSignedPoints } from "./formatPoints";

describe("formatSignedPoints", () => {
    it("prefixes positives with a plus", () => expect(formatSignedPoints(5)).toBe("+5"));
    it("shows negatives with a single minus", () => expect(formatSignedPoints(-5)).toBe("-5"));
    it("shows zero plain", () => expect(formatSignedPoints(0)).toBe("0"));
    it("keeps decimals", () => expect(formatSignedPoints(-2.5)).toBe("-2.5"));
});
