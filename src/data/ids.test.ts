import { afterEach, describe, expect, it, vi } from "vitest";
import { newId } from "./ids";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("newId", () => {
  it("returns unique, non-empty ids", () => {
    const ids = Array.from({ length: 200 }, () => newId());
    expect(new Set(ids).size).toBe(200);
    expect(ids.every((id) => id.length > 0)).toBe(true);
  });

  it("falls back when crypto is unavailable", () => {
    vi.stubGlobal("crypto", undefined);
    expect(newId()).toMatch(/^[a-z0-9]+-[a-z0-9]*$/);
  });

  it("falls back when randomUUID is missing, as in non-secure contexts", () => {
    vi.stubGlobal("crypto", {});
    expect(newId()).toMatch(/^[a-z0-9]+-[a-z0-9]*$/);
  });
});