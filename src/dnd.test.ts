import { describe, expect, it } from "vitest";
import {
  buildLayout,
  cardKey,
  columnKey,
  columnOfOver,
  describePlacement,
  findColumnOf,
  parseCardKey,
  parseColumnKey,
  planMove,
  previewLayout,
  sameOrder,
  stepLayout,
} from "./dnd";
import type { Layout } from "./dnd";
import { makeCard, makeColumn } from "./test/dataFactories";

const layout: Layout = { c1: ["k1", "k2", "k3"], c2: ["k4"], c3: [] };

describe("keys", () => {
  it("parses its own prefixes", () => {
    expect(parseCardKey("card:k1")).toBe("k1");
    expect(parseColumnKey("column:c3")).toBe("c3");
    expect(parseCardKey(cardKey("k7"))).toBe("k7");
    expect(parseColumnKey(columnKey("c8"))).toBe("c8");
  });

  it("rejects other prefixes and junk", () => {
    expect(parseCardKey("column:c3")).toBeNull();
    expect(parseColumnKey("card:c3")).toBeNull();
    expect(parseCardKey("card:")).toBeNull();
    expect(parseCardKey("junk")).toBeNull();
    expect(parseCardKey(12)).toBeNull();
  });

  it("handles ids that contain hyphens, like UUIDs", () => {
    const id = "3f2a9b77-1c4d-4e8a-9f00-aa11bb22cc33";
    expect(parseCardKey(cardKey(id))).toBe(id);
    expect(parseColumnKey(columnKey(id))).toBe(id);
  });
});

describe("layout helpers", () => {
  it("buildLayout maps column ids to ordered card ids", () => {
    const columns = [makeColumn("c1", [makeCard("k1"), makeCard("k2")]), makeColumn("c2")];
    expect(buildLayout(columns)).toEqual({ c1: ["k1", "k2"], c2: [] });
  });

  it("findColumnOf finds the column holding a card", () => {
    expect(findColumnOf(layout, "k4")).toBe("c2");
    expect(findColumnOf(layout, "nope")).toBeNull();
  });

  it("columnOfOver resolves cards and columns, and rejects unknown ones", () => {
    expect(columnOfOver(layout, "card:k4")).toBe("c2");
    expect(columnOfOver(layout, "column:c3")).toBe("c3");
    expect(columnOfOver(layout, "card:nope")).toBeNull();
    expect(columnOfOver(layout, "column:nope")).toBeNull();
    expect(columnOfOver(layout, "junk")).toBeNull();
  });

  it("sameOrder compares order, not just contents", () => {
    expect(sameOrder(["a", "b", "c"], ["a", "b", "c"])).toBe(true);
    expect(sameOrder(["a", "b", "c"], ["a", "c", "b"])).toBe(false);
    expect(sameOrder(["a", "b"], ["a", "b", "c"])).toBe(false);
  });
});

describe("previewLayout", () => {
  it("moves the card above the hovered card in another column", () => {
    expect(previewLayout(layout, "k1", "card:k4", false)).toEqual({
      c1: ["k2", "k3"],
      c2: ["k1", "k4"],
      c3: [],
    });
  });

  it("moves it below when the pointer is in the lower half", () => {
    expect(previewLayout(layout, "k1", "card:k4", true)).toEqual({
      c1: ["k2", "k3"],
      c2: ["k4", "k1"],
      c3: [],
    });
  });

  it("puts the card into an empty column", () => {
    expect(previewLayout(layout, "k1", "column:c3", false)).toEqual({
      c1: ["k2", "k3"],
      c2: ["k4"],
      c3: ["k1"],
    });
  });

  it("appends when hovering a column's body instead of a card", () => {
    expect(previewLayout(layout, "k1", "column:c2", false)).toEqual({
      c1: ["k2", "k3"],
      c2: ["k4", "k1"],
      c3: [],
    });
  });

  it("returns null while still over its own column", () => {
    expect(previewLayout(layout, "k1", "card:k2", false)).toBeNull();
    expect(previewLayout(layout, "k1", "column:c1", false)).toBeNull();
  });

  it("returns null for unknown targets", () => {
    expect(previewLayout(layout, "k1", "card:nope", false)).toBeNull();
    expect(previewLayout(layout, "k1", "column:nope", false)).toBeNull();
  });

  it("never mutates the layout it's given", () => {
    const before = JSON.parse(JSON.stringify(layout)) as Layout;
    previewLayout(layout, "k1", "card:k4", false);
    expect(layout).toEqual(before);
  });
});

describe("planMove", () => {
  const start: Layout = { c1: ["k1", "k2", "k3"], c2: ["k4"], c3: [] };

  it("plans a reorder inside a column", () => {
    expect(planMove(start, start, "k1", "card:k3")).toEqual({
      columnId: "c1",
      ids: ["k2", "k3", "k1"],
    });
  });

  it("plans a move to the top", () => {
    expect(planMove(start, start, "k3", "card:k1")).toEqual({
      columnId: "c1",
      ids: ["k3", "k1", "k2"],
    });
  });

  it("returns null when the card is dropped where it started", () => {
    expect(planMove(start, start, "k1", "card:k1")).toBeNull();
  });

  it("keeps the previewed position for a cross-column move", () => {
    const previewed: Layout = { c1: ["k2", "k3"], c2: ["k1", "k4"], c3: [] };
    expect(planMove(start, previewed, "k1", "card:k1")).toEqual({
      columnId: "c2",
      ids: ["k1", "k4"],
    });
  });

  it("plans a move into an empty column", () => {
    const previewed: Layout = { c1: ["k2", "k3"], c2: ["k4"], c3: ["k1"] };
    expect(planMove(start, previewed, "k1", "column:c3")).toEqual({ columnId: "c3", ids: ["k1"] });
  });

  it("returns null for a card that isn't in the layout", () => {
    expect(planMove(start, start, "nope", "card:k1")).toBeNull();
  });

  it("ignores a target card that lives in another column", () => {
    expect(planMove(start, start, "k1", "card:k4")).toBeNull();
  });
});

describe("stepLayout", () => {
  const columnIds = ["c1", "c2", "c3"];
  const wide: Layout = { c1: ["k1", "k2", "k3"], c2: ["k4", "k5"], c3: [] };

  it("moves down within a column", () => {
    expect(stepLayout(wide, columnIds, "k1", "down")).toEqual({
      c1: ["k2", "k1", "k3"],
      c2: ["k4", "k5"],
      c3: [],
    });
  });

  it("moves up within a column", () => {
    expect(stepLayout(wide, columnIds, "k3", "up")).toEqual({
      c1: ["k1", "k3", "k2"],
      c2: ["k4", "k5"],
      c3: [],
    });
  });

  it("stops at the top and bottom of a column", () => {
    expect(stepLayout(wide, columnIds, "k1", "up")).toBeNull();
    expect(stepLayout(wide, columnIds, "k3", "down")).toBeNull();
  });

  it("moves right, keeping its place in the list when the next column is long enough", () => {
    expect(stepLayout(wide, columnIds, "k2", "right")).toEqual({
      c1: ["k1", "k3"],
      c2: ["k4", "k2", "k5"],
      c3: [],
    });
  });

  it("goes to the end of a shorter column", () => {
    expect(stepLayout(wide, columnIds, "k3", "right")).toEqual({
      c1: ["k1", "k2"],
      c2: ["k4", "k5", "k3"],
      c3: [],
    });
  });

  it("moves into an empty column", () => {
    expect(stepLayout(wide, columnIds, "k4", "right")).toEqual({
      c1: ["k1", "k2", "k3"],
      c2: ["k5"],
      c3: ["k4"],
    });
  });

  it("moves left", () => {
    expect(stepLayout(wide, columnIds, "k5", "left")).toEqual({
      c1: ["k1", "k5", "k2", "k3"],
      c2: ["k4"],
      c3: [],
    });
  });

  it("stops at the first and last column", () => {
    expect(stepLayout(wide, columnIds, "k1", "left")).toBeNull();
    const last: Layout = { c1: ["k1"], c2: [], c3: ["k6"] };
    expect(stepLayout(last, columnIds, "k6", "right")).toBeNull();
  });

  it("returns null for unknown cards or columns", () => {
    expect(stepLayout(wide, columnIds, "nope", "down")).toBeNull();
    expect(stepLayout(wide, ["x", "y", "z"], "k1", "right")).toBeNull();
  });

  it("never mutates the layout it's given", () => {
    const before = JSON.parse(JSON.stringify(wide)) as Layout;
    stepLayout(wide, columnIds, "k2", "right");
    stepLayout(wide, columnIds, "k2", "down");
    expect(wide).toEqual(before);
  });
});

describe("describePlacement", () => {
  const columns = [makeColumn("c1", [], "To do"), makeColumn("c2", [], "Done")];

  it("says where a card is", () => {
    expect(describePlacement(layout, columns, "k2")).toBe("position 2 of 3 in To do");
    expect(describePlacement(layout, columns, "k4")).toBe("position 1 of 1 in Done");
  });

  it("returns null for a card that isn't in the layout", () => {
    expect(describePlacement(layout, columns, "nope")).toBeNull();
  });

  it("falls back when the column isn't known", () => {
    expect(describePlacement(layout, [], "k1")).toBe("position 1 of 3 in this column");
  });
});