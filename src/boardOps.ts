import type { Board, Card, CardChanges, Column } from "./data/model";

export function addColumn(board: Board, column: Column): Board {
  return { ...board, columns: [...board.columns, column] };
}

export function renameColumn(board: Board, columnId: string, title: string): Board {
  return {
    ...board,
    columns: board.columns.map((c) => (c.id === columnId ? { ...c, title } : c)),
  };
}

export function removeColumn(board: Board, columnId: string): Board {
  return { ...board, columns: board.columns.filter((c) => c.id !== columnId) };
}

// New cards go to the bottom of their column.
export function addCard(board: Board, columnId: string, card: Card): Board {
  if (!board.columns.some((c) => c.id === columnId)) return board;
  return {
    ...board,
    columns: board.columns.map((c) =>
      c.id === columnId ? { ...c, cards: [...c.cards, card] } : c,
    ),
  };
}

export function updateCard(board: Board, cardId: string, changes: CardChanges, now: string): Board {
  return {
    ...board,
    columns: board.columns.map((c) => ({
      ...c,
      cards: c.cards.map((card) =>
        card.id === cardId
          ? {
              ...card,
              title: changes.title ?? card.title,
              description: changes.description ?? card.description,
              dueDate: changes.dueDate === undefined ? card.dueDate : changes.dueDate,
              updatedAt: now,
            }
          : card,
      ),
    })),
  };
}

export function removeCard(board: Board, cardId: string): Board {
  return {
    ...board,
    columns: board.columns.map((c) => ({ ...c, cards: c.cards.filter((k) => k.id !== cardId) })),
  };
}

// Moves a card into a column and orders that column to match orderedIds. Works for same-column
// and cross-column moves. Unknown cards or columns leave the board untouched (never loses a card).
export function placeCard(
  board: Board,
  cardId: string,
  columnId: string,
  orderedIds: string[],
): Board {
  const moving = board.columns.flatMap((c) => c.cards).find((c) => c.id === cardId);
  if (!moving || !board.columns.some((c) => c.id === columnId)) return board;

  const rank = new Map(orderedIds.map((id, i): [string, number] => [id, i]));
  const rankOf = (id: string) => rank.get(id) ?? Number.MAX_SAFE_INTEGER;
  return {
    ...board,
    columns: board.columns.map((c) => {
      const others = c.cards.filter((x) => x.id !== cardId);
      if (c.id !== columnId) return { ...c, cards: others };
      return { ...c, cards: [...others, moving].sort((a, b) => rankOf(a.id) - rankOf(b.id)) };
    }),
  };
}