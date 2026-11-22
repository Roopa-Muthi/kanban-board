import { describe, expect, it } from "vitest";
import { backupFilename, readFileText } from "./files";

describe("backupFilename", () => {
  it("includes the date", () => {
    expect(backupFilename(new Date(2026, 10, 22))).toBe("kanban-backup-2026-11-22.json");
  });
});

describe("readFileText", () => {
  it("reads a file's text", async () => {
    const file = new File(['{"a":1}'], "x.json", { type: "application/json" });
    await expect(readFileText(file)).resolves.toBe('{"a":1}');
  });
});