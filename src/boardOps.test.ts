import { describe, expect, it } from "vitest";
import * as ops from "./boardOps";
import type { Board } from "./data/model";
import { makeBoard, makeCard, makeColumn } from "./test/dataFactories";

const NOW = "2026-02-02T00:00:00.000Z";
const STAMP = "2026-01-01T00:00:00.000Z";

function sample(): Board {
  return makeBoard("b1", [
    makeColumn("c1", [makeCard("k1"), makeCard("k2"), makeCard("k3")]),
    makeColumn("c2", [makeCard("k4")]),
    makeColumn("c3"),
  ]);
}

const ids = (board: Board, columnId: string): string[] =>
  board.columns.find((c) => c.id === columnId)?.cards.map((c) => c.id) ?? [];

const cardOf = (board: Board, cardId: string) =>
  board.columns.flatMap((c) => c.cards).find((c) => c.id === cardId);

describe("column operations", () => {
  it("addColumn appends an empty column", () => {
    const next = ops.addColumn(sample(), makeColumn("c4", [], "Review"));
    expect(next.columns.map((c) => c.id)).toEqual(["c1", "c2", "c3", "c4"]);
    expect(next.columns[3]).toEqual({ id: "c4", title: "Review", cards: [] });
  });

  it("renameColumn changes only the title", () => {
    const next = ops.renameColumn(sample(), "c2", "Doing");
    expect(next.columns.find((c) => c.id === "c2")?.title).toBe("Doing");
    expect(ids(next, "c2")).toEqual(["k4"]);
    expect(next.columns.find((c) => c.id === "c1")?.title).toBe("Column c1");
  });

  it("removeColumn drops the column and its cards", () => {
    const next = ops.removeColumn(sample(), "c1");
    expect(next.columns.map((c) => c.id)).toEqual(["c2", "c3"]);
  });
});

describe("card operations", () => {
  it("addCard appends to the bottom of its column", () => {
    const next = ops.addCard(sample(), "c1", makeCard("k9"));
    expect(ids(next, "c1")).toEqual(["k1", "k2", "k3", "k9"]);
  });

  it("addCard ignores a column that doesn't exist", () => {
    const board = sample();
    expect(ops.addCard(board, "nope", makeCard("k9"))).toBe(board);
  });

  it("updateCard changes only the given fields and stamps updatedAt", () => {
    const next = ops.updateCard(sample(), "k1", { description: "Notes" }, NOW);
    expect(cardOf(next, "k1")).toMatchObject({
      title: "Card k1",
      description: "Notes",
      dueDate: null,
      updatedAt: NOW,
    });
    expect(cardOf(next, "k2")?.updatedAt).toBe(STAMP);
  });

  it("updateCard sets and clears a due date", () => {
    const set = ops.updateCard(sample(), "k1", { dueDate: "2026-12-01" }, NOW);
    expect(cardOf(set, "k1")?.dueDate).toBe("2026-12-01");
    const cleared = ops.updateCard(set, "k1", { dueDate: null }, NOW);
    expect(cardOf(cleared, "k1")?.dueDate).toBeNull();
  });

  it("removeCard removes just that card", () => {
    const next = ops.removeCard(sample(), "k2");
    expect(ids(next, "c1")).toEqual(["k1", "k3"]);
    expect(ids(next, "c2")).toEqual(["k4"]);
  });
});

describe("placeCard", () => {
  it("reorders within a column", () => {
    const next = ops.placeCard(sample(), "k3", "c1", ["k3", "k1", "k2"]);
    expect(ids(next, "c1")).toEqual(["k3", "k1", "k2"]);
  });

  it("moves a card to another column", () => {
    const next = ops.placeCard(sample(), "k1", "c2", ["k4", "k1"]);
    expect(ids(next, "c1")).toEqual(["k2", "k3"]);
    expect(ids(next, "c2")).toEqual(["k4", "k1"]);
  });

  it("moves a card into an empty column", () => {
    const next = ops.placeCard(sample(), "k4", "c3", ["k4"]);
    expect(ids(next, "c2")).toEqual([]);
    expect(ids(next, "c3")).toEqual(["k4"]);
  });

  it("returns the same board when the card doesn't exist", () => {
    const board = sample();
    expect(ops.placeCard(board, "nope", "c1", ["nope"])).toBe(board);
  });

  it("returns the same board when the column doesn't exist, so no card is lost", () => {
    const board = sample();
    expect(ops.placeCard(board, "k1", "nope", ["k1"])).toBe(board);
  });
});

describe("immutability", () => {
  it("never mutates its input", () => {
    const board = sample();
    const snapshot = JSON.parse(JSON.stringify(board)) as Board;
    ops.placeCard(board, "k3", "c2", ["k3", "k4"]);
    ops.removeCard(board, "k1");
    ops.addCard(board, "c3", makeCard("k9"));
    ops.updateCard(board, "k2", { title: "Changed" }, NOW);
    ops.removeColumn(board, "c1");
    expect(board).toEqual(snapshot);
  });
});