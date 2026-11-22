import { describe, expect, it } from "vitest";
import { BOARD_HUES, accentHue, plural } from "./format";

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

  it("always returns one of the palette hues, even for empty or very long ids", () => {
    const ids = ["", "a", "x".repeat(5000), ...Array.from({ length: 200 }, (_, i) => `board-${i}`)];
    for (const id of ids) {
      expect(BOARD_HUES).toContain(accentHue(id));
    }
  });

  it("spreads boards across the palette", () => {
    const hues = new Set(Array.from({ length: 100 }, (_, i) => accentHue(`board-${i}`)));
    expect(hues.size).toBeGreaterThanOrEqual(5);
  });

  it("avoids reds and pinks, which read as errors", () => {
    expect(BOARD_HUES.every((hue) => hue >= 20 && hue <= 300)).toBe(true);
  });
});