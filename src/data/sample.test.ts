import { describe, expect, it } from "vitest";
import { isOverdue } from "../dates";
import { createSampleBoards, createSampleData } from "./sample";
import { parseAppData } from "./storage";

const NOW = new Date(2026, 2, 10, 15, 0); // 10 March 2026, 3pm local time

const allCards = (boards: ReturnType<typeof createSampleBoards>) =>
  boards.flatMap((b) => b.columns).flatMap((c) => c.cards);

describe("createSampleBoards", () => {
  it("creates the two boards in display order, with an empty column", () => {
    const boards = createSampleBoards(NOW);
    expect(boards.map((b) => b.name)).toEqual(["Product launch", "Weekend project"]);
    expect(boards[0]?.columns.map((c) => c.cards.length)).toEqual([3, 3, 2, 3]);
    expect(boards[1]?.columns.map((c) => c.cards.length)).toEqual([2, 1, 0]);
  });

  it("produces data that passes validation, so every id is unique", () => {
    expect(parseAppData(createSampleData(NOW))).not.toBeNull();
  });

  it("sets due dates relative to the given day", () => {
    const cards = allCards(createSampleBoards(NOW));
    const due = (title: string) => cards.find((c) => c.title === title)?.dueDate;
    expect(due("Fix the signup form on mobile")).toBe("2026-03-08");
    expect(due("Build the pricing page")).toBe("2026-03-13");
    expect(due("Collect three customer quotes")).toBeNull();
  });

  it("has exactly one overdue card", () => {
    const overdue = allCards(createSampleBoards(NOW)).filter(
      (c) => c.dueDate !== null && isOverdue(c.dueDate, NOW),
    );
    expect(overdue.map((c) => c.title)).toEqual(["Fix the signup form on mobile"]);
  });

  it("stamps everything with the given time", () => {
    const stamp = NOW.toISOString();
    const boards = createSampleBoards(NOW);
    expect(boards.every((b) => b.createdAt === stamp)).toBe(true);
    expect(allCards(boards).every((c) => c.createdAt === stamp && c.updatedAt === stamp)).toBe(true);
  });

  it("gives every call fresh ids", () => {
    const first = createSampleBoards(NOW).map((b) => b.id);
    const second = createSampleBoards(NOW).map((b) => b.id);
    expect(first.filter((id) => second.includes(id))).toEqual([]);
  });
});