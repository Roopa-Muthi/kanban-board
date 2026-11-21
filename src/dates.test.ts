import { describe, expect, it } from "vitest";
import { formatDay, isOverdue, parseDay } from "./dates";

describe("parseDay", () => {
  it("parses a valid date as local midnight", () => {
    const date = parseDay("2026-03-09");
    expect(date?.getFullYear()).toBe(2026);
    expect(date?.getMonth()).toBe(2);
    expect(date?.getDate()).toBe(9);
    expect(date?.getHours()).toBe(0);
  });

  it("rejects malformed and impossible dates", () => {
    for (const bad of ["2026-02-31", "2026-13-01", "2026-1-5", "nope", "", "2026-03-09T10:00"]) {
      expect(parseDay(bad), bad).toBeNull();
    }
  });
});

describe("isOverdue", () => {
  const noon = new Date(2026, 2, 10, 12, 0);

  it("is true for a past date", () => {
    expect(isOverdue("2026-03-09", noon)).toBe(true);
  });

  it("is false for today, even late in the evening", () => {
    expect(isOverdue("2026-03-10", new Date(2026, 2, 10, 23, 59))).toBe(false);
  });

  it("is false for a future date", () => {
    expect(isOverdue("2026-03-11", noon)).toBe(false);
  });

  it("is false for text that isn't a date", () => {
    expect(isOverdue("garbage", noon)).toBe(false);
  });
});

describe("formatDay", () => {
  it("formats a date and returns null for garbage", () => {
    const text = formatDay("2026-12-15");
    expect(text).toContain("2026");
    expect(text).toContain("15");
    expect(formatDay("garbage")).toBeNull();
  });
});