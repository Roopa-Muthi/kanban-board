import { describe, expect, it } from "vitest";
import { makeBoard, makeCard, makeColumn, makeData } from "../test/dataFactories";
import { loadData, parseAppData, parseJson, saveData, serialize } from "./storage";

const KEY = "kanban.data";

function sample() {
  return makeData([
    makeBoard("b1", [
      makeColumn("c1", [makeCard("k1"), makeCard("k2", { dueDate: "2026-12-01" })]),
      makeColumn("c2"),
    ]),
    makeBoard("b2"),
  ]);
}

// Storage that refuses everything, like a blocked or full browser store.
const blocked = {
  getItem() {
    throw new Error("blocked");
  },
  setItem() {
    throw new Error("quota exceeded");
  },
} as unknown as Storage;

describe("loadData", () => {
  it("starts empty on the first visit", () => {
    const result = loadData();
    expect(result.status).toBe("first-run");
    expect(result.data.boards).toEqual([]);
  });

  it("loads what was saved", () => {
    saveData(sample());
    const result = loadData();
    expect(result.status).toBe("ok");
    expect(result.data).toEqual(sample());
  });

  it("treats unparseable text as corrupt, resets, and keeps a copy", () => {
    localStorage.setItem(KEY, "{not json");
    const result = loadData();
    expect(result.status).toBe("corrupt");
    expect(result.data.boards).toEqual([]);
    expect(localStorage.getItem(`${KEY}.corrupt`)).toBe("{not json");
  });

  it("treats data of the wrong shape as corrupt", () => {
    const wrong = {
      version: 1,
      boards: [
        { id: "b", name: "x", createdAt: "t", columns: [{ id: "c", title: "t", cards: [{ id: "k" }] }] },
      ],
    };
    localStorage.setItem(KEY, JSON.stringify(wrong));
    expect(loadData().status).toBe("corrupt");
  });

  it("treats an unknown schema version as corrupt", () => {
    localStorage.setItem(KEY, JSON.stringify({ version: 2, boards: [] }));
    expect(loadData().status).toBe("corrupt");
  });

  it("treats duplicate ids as corrupt", () => {
    saveData(makeData([makeBoard("b1", [makeColumn("c1", [makeCard("k1"), makeCard("k1")])])]));
    expect(loadData().status).toBe("corrupt");
  });

  it("reports unavailable storage", () => {
    const result = loadData(blocked);
    expect(result.status).toBe("unavailable");
    expect(result.data.boards).toEqual([]);
    expect(loadData(null).status).toBe("unavailable");
  });
});

describe("saveData", () => {
  it("reports success and stores the data", () => {
    expect(saveData(sample())).toBe(true);
    expect(localStorage.getItem(KEY)).not.toBeNull();
  });

  it("reports failure when the browser refuses", () => {
    expect(saveData(sample(), blocked)).toBe(false);
    expect(saveData(sample(), null)).toBe(false);
  });
});

describe("parseAppData", () => {
  it("accepts both null and string due dates", () => {
    expect(parseAppData(sample())).toEqual(sample());
  });

  it("rejects a due date that isn't a string or null", () => {
    const bad = {
      version: 1,
      boards: [
        {
          id: "b",
          name: "x",
          createdAt: "t",
          columns: [
            {
              id: "c",
              title: "t",
              cards: [{ id: "k", title: "t", description: "", dueDate: 5, createdAt: "t", updatedAt: "t" }],
            },
          ],
        },
      ],
    };
    expect(parseAppData(bad)).toBeNull();
  });

  it("rejects things that aren't data objects", () => {
    expect(parseAppData(null)).toBeNull();
    expect(parseAppData([])).toBeNull();
    expect(parseAppData("x")).toBeNull();
  });

  it("drops unknown fields", () => {
    const withExtras = { ...sample(), extra: true };
    expect(parseAppData(withExtras)).toEqual(sample());
  });
});

describe("export and import", () => {
  it("round-trips through JSON text", () => {
    expect(parseJson(serialize(sample()))).toEqual(sample());
  });

  it("returns null for text that isn't valid data", () => {
    expect(parseJson("garbage")).toBeNull();
    expect(parseJson('{"version":1,"boards":"nope"}')).toBeNull();
  });
});