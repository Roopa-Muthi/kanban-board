import type { AppData, Board, Card, Column } from "../data/model";

const STAMP = "2026-01-01T00:00:00.000Z";

export function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    title: `Card ${id}`,
    description: "",
    dueDate: null,
    createdAt: STAMP,
    updatedAt: STAMP,
    ...overrides,
  };
}

export function makeColumn(id: string, cards: Card[] = [], title = `Column ${id}`): Column {
  return { id, title, cards };
}

export function makeBoard(id: string, columns: Column[] = [], name = `Board ${id}`): Board {
  return { id, name, createdAt: STAMP, columns };
}

export function makeData(boards: Board[] = []): AppData {
  return { version: 1, boards };
}