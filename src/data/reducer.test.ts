import { describe, expect, it } from "vitest";
import { makeBoard, makeCard, makeColumn, makeData } from "../test/dataFactories";
import type { AppData } from "./model";
import { reducer } from "./reducer";

const NOW = "2026-02-02T00:00:00.000Z";
const STAMP = "2026-01-01T00:00:00.000Z";

function sample(): AppData {
  return makeData([
    makeBoard("b1", [
      makeColumn("c1", [makeCard("k1"), makeCard("k2")]),
      makeColumn("c2", [makeCard("k3")]),
    ]),
    makeBoard("b2"),
  ]);
}

const board = (data: AppData, id: string) => data.boards.find((b) => b.id === id);

const cardIds = (data: AppData, boardId: string, columnId: string): string[] =>
  board(data, boardId)
    ?.columns.find((c) => c.id === columnId)
    ?.cards.map((k) => k.id) ?? [];

const cardOf = (data: AppData, cardId: string) =>
  data.boards
    .flatMap((b) => b.columns)
    .flatMap((c) => c.cards)
    .find((k) => k.id === cardId);

describe("boards", () => {
  it("adds a trimmed board at the front", () => {
    const next = reducer(sample(), { type: "board/add", id: "b3", name: "  Sprint  ", now: NOW });
    expect(next.boards.map((b) => b.id)).toEqual(["b3", "b1", "b2"]);
    expect(next.boards[0]).toEqual({ id: "b3", name: "Sprint", createdAt: NOW, columns: [] });
  });

  it("ignores a blank board name", () => {
    const data = sample();
    expect(reducer(data, { type: "board/add", id: "b3", name: "   ", now: NOW })).toBe(data);
  });

  it("renames a board", () => {
    const next = reducer(sample(), { type: "board/rename", boardId: "b2", name: " Roadmap " });
    expect(board(next, "b2")?.name).toBe("Roadmap");
    expect(board(next, "b1")?.name).toBe("Board b1");
  });

  it("ignores a blank rename", () => {
    const data = sample();
    expect(reducer(data, { type: "board/rename", boardId: "b1", name: " " })).toBe(data);
  });

  it("deletes only that board", () => {
    const next = reducer(sample(), { type: "board/delete", boardId: "b1" });
    expect(next.boards.map((b) => b.id)).toEqual(["b2"]);
  });
});

describe("columns", () => {
  it("adds a trimmed empty column at the end", () => {
    const next = reducer(sample(), { type: "column/add", boardId: "b1", id: "c9", title: " Review " });
    expect(board(next, "b1")?.columns.map((c) => c.id)).toEqual(["c1", "c2", "c9"]);
    expect(board(next, "b1")?.columns[2]).toEqual({ id: "c9", title: "Review", cards: [] });
  });

  it("renames a column", () => {
    const next = reducer(sample(), {
      type: "column/rename",
      boardId: "b1",
      columnId: "c2",
      title: "Doing",
    });
    expect(board(next, "b1")?.columns.find((c) => c.id === "c2")?.title).toBe("Doing");
  });

  it("deletes a column and its cards", () => {
    const next = reducer(sample(), { type: "column/delete", boardId: "b1", columnId: "c1" });
    expect(board(next, "b1")?.columns.map((c) => c.id)).toEqual(["c2"]);
    expect(cardOf(next, "k1")).toBeUndefined();
  });
});

describe("cards", () => {
  it("adds a card with defaults at the bottom of its column", () => {
    const next = reducer(sample(), {
      type: "card/add",
      boardId: "b1",
      columnId: "c1",
      id: "k9",
      title: " New ",
      now: NOW,
    });
    expect(cardIds(next, "b1", "c1")).toEqual(["k1", "k2", "k9"]);
    expect(cardOf(next, "k9")).toEqual({
      id: "k9",
      title: "New",
      description: "",
      dueDate: null,
      createdAt: NOW,
      updatedAt: NOW,
    });
  });

  it("updates a card, trims the title and stamps only that card", () => {
    const next = reducer(sample(), {
      type: "card/update",
      boardId: "b1",
      cardId: "k1",
      changes: { title: " Renamed ", description: "Text", dueDate: "2026-12-01" },
      now: NOW,
    });
    expect(cardOf(next, "k1")).toMatchObject({
      title: "Renamed",
      description: "Text",
      dueDate: "2026-12-01",
      createdAt: STAMP,
      updatedAt: NOW,
    });
    expect(cardOf(next, "k2")?.updatedAt).toBe(STAMP);
  });

  it("ignores a blank title but still applies the other changes", () => {
    const next = reducer(sample(), {
      type: "card/update",
      boardId: "b1",
      cardId: "k1",
      changes: { title: "   ", description: "Kept" },
      now: NOW,
    });
    expect(cardOf(next, "k1")).toMatchObject({ title: "Card k1", description: "Kept" });
  });

  it("clears a due date with null", () => {
    const data = makeData([
      makeBoard("b1", [makeColumn("c1", [makeCard("k1", { dueDate: "2026-01-05" })])]),
    ]);
    const next = reducer(data, {
      type: "card/update",
      boardId: "b1",
      cardId: "k1",
      changes: { dueDate: null },
      now: NOW,
    });
    expect(cardOf(next, "k1")?.dueDate).toBeNull();
  });

  it("deletes a card", () => {
    const next = reducer(sample(), { type: "card/delete", boardId: "b1", cardId: "k1" });
    expect(cardIds(next, "b1", "c1")).toEqual(["k2"]);
  });

  it("places a card in another column in the given order", () => {
    const next = reducer(sample(), {
      type: "card/place",
      boardId: "b1",
      cardId: "k1",
      columnId: "c2",
      orderedIds: ["k3", "k1"],
    });
    expect(cardIds(next, "b1", "c1")).toEqual(["k2"]);
    expect(cardIds(next, "b1", "c2")).toEqual(["k3", "k1"]);
  });
});

describe("edge cases", () => {
  it("returns the same object when the board doesn't exist, so nothing gets saved", () => {
    const data = sample();
    expect(reducer(data, { type: "column/add", boardId: "nope", id: "c9", title: "x" })).toBe(data);
    expect(reducer(data, { type: "board/rename", boardId: "nope", name: "x" })).toBe(data);
    expect(reducer(data, { type: "board/delete", boardId: "nope" })).toBe(data);
    expect(
      reducer(data, { type: "card/update", boardId: "nope", cardId: "k1", changes: {}, now: NOW }),
    ).toBe(data);
    expect(
      reducer(data, {
        type: "card/place",
        boardId: "nope",
        cardId: "k1",
        columnId: "c1",
        orderedIds: [],
      }),
    ).toBe(data);
  });

  it("replaces everything on data/replace", () => {
    const other = makeData([makeBoard("x1")]);
    expect(reducer(sample(), { type: "data/replace", data: other })).toBe(other);
  });
});