import { describe, expect, it } from "vitest";
import { accentHue, plural } from "./format";

describe("plural", () => {
  it("uses the singular only for exactly one", () => {
    expect(plural(1, "card")).toBe("1 card");
    expect(plural(0, "card")).toBe("0 cards");
    expect(plural(2, "card")).toBe("2 cards");
  });
});

describe("accentHue", () => {
  it("is stable for the same id", () => {
    expect(accentHue("3f2a9b77-1c4d")).toBe(accentHue("3f2a9b77-1c4d"));
  });

  it("stays within 0-359, even for empty or very long ids", () => {
    const ids = ["", "a", "x".repeat(5000), ...Array.from({ length: 200 }, (_, i) => `board-${i}`)];
    for (const id of ids) {
      const hue = accentHue(id);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
      expect(Number.isInteger(hue)).toBe(true);
    }
  });

  it("gives different boards a spread of colours", () => {
    const hues = new Set(Array.from({ length: 100 }, (_, i) => accentHue(`board-${i}`)));
    expect(hues.size).toBeGreaterThan(20);
  });
});