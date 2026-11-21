import * as ops from "../boardOps";
import type { AppData, Board, Card, CardChanges } from "./model";

export type Action =
  | { type: "board/add"; id: string; name: string; now: string }
  | { type: "board/rename"; boardId: string; name: string }
  | { type: "board/delete"; boardId: string }
  | { type: "column/add"; boardId: string; id: string; title: string }
  | { type: "column/rename"; boardId: string; columnId: string; title: string }
  | { type: "column/delete"; boardId: string; columnId: string }
  | { type: "card/add"; boardId: string; columnId: string; id: string; title: string; now: string }
  | { type: "card/update"; boardId: string; cardId: string; changes: CardChanges; now: string }
  | { type: "card/delete"; boardId: string; cardId: string }
  | { type: "card/place"; boardId: string; cardId: string; columnId: string; orderedIds: string[] }
  | { type: "data/replace"; data: AppData };

function mapBoard(data: AppData, boardId: string, fn: (board: Board) => Board): AppData {
  if (!data.boards.some((b) => b.id === boardId)) return data;
  return { ...data, boards: data.boards.map((b) => (b.id === boardId ? fn(b) : b)) };
}

export function reducer(data: AppData, action: Action): AppData {
  switch (action.type) {
    case "board/add": {
      const name = action.name.trim();
      if (!name) return data;
      const board: Board = { id: action.id, name, createdAt: action.now, columns: [] };
      return { ...data, boards: [board, ...data.boards] }; // newest first
    }
    case "board/rename": {
      const name = action.name.trim();
      if (!name) return data;
      return mapBoard(data, action.boardId, (b) => ({ ...b, name }));
    }
    case "board/delete": {
      if (!data.boards.some((b) => b.id === action.boardId)) return data;
      return { ...data, boards: data.boards.filter((b) => b.id !== action.boardId) };
    }
    case "column/add": {
      const title = action.title.trim();
      if (!title) return data;
      return mapBoard(data, action.boardId, (b) =>
        ops.addColumn(b, { id: action.id, title, cards: [] }),
      );
    }
    case "column/rename": {
      const title = action.title.trim();
      if (!title) return data;
      return mapBoard(data, action.boardId, (b) => ops.renameColumn(b, action.columnId, title));
    }
    case "column/delete":
      return mapBoard(data, action.boardId, (b) => ops.removeColumn(b, action.columnId));
    case "card/add": {
      const title = action.title.trim();
      if (!title) return data;
      const card: Card = {
        id: action.id,
        title,
        description: "",
        dueDate: null,
        createdAt: action.now,
        updatedAt: action.now,
      };
      return mapBoard(data, action.boardId, (b) => ops.addCard(b, action.columnId, card));
    }
    case "card/update": {
      const changes: CardChanges = { ...action.changes };
      if (changes.title !== undefined) {
        const title = changes.title.trim();
        if (title) changes.title = title;
        else delete changes.title; // a blank title is ignored; other changes still apply
      }
      return mapBoard(data, action.boardId, (b) => ops.updateCard(b, action.cardId, changes, action.now));
    }
    case "card/delete":
      return mapBoard(data, action.boardId, (b) => ops.removeCard(b, action.cardId));
    case "card/place":
      return mapBoard(data, action.boardId, (b) =>
        ops.placeCard(b, action.cardId, action.columnId, action.orderedIds),
      );
    case "data/replace":
      return action.data;
  }
}