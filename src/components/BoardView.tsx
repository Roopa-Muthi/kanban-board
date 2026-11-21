import { newId } from "../data/ids";
import { LIMITS } from "../data/model";
import type { Board, Card, Column } from "../data/model";
import { useDispatch } from "../data/useStore";
import { AddForm } from "./AddForm";
import { BoardColumn } from "./BoardColumn";

export function BoardView({ board }: { board: Board }) {
  const dispatch = useDispatch();
  const boardId = board.id;

  function addColumn(title: string) {
    dispatch({ type: "column/add", boardId, id: newId(), title });
  }

  function renameColumn(columnId: string, title: string) {
    dispatch({ type: "column/rename", boardId, columnId, title });
  }

  function deleteColumn(column: Column) {
    const n = column.cards.length;
    const message =
      n > 0
        ? `Delete "${column.title}" and its ${n} card${n === 1 ? "" : "s"}?`
        : `Delete "${column.title}"?`;
    if (!window.confirm(message)) return;
    dispatch({ type: "column/delete", boardId, columnId: column.id });
  }

  function addCard(columnId: string, title: string) {
    dispatch({
      type: "card/add",
      boardId,
      columnId,
      id: newId(),
      title,
      now: new Date().toISOString(),
    });
  }

  function renameCard(cardId: string, title: string) {
    dispatch({
      type: "card/update",
      boardId,
      cardId,
      changes: { title },
      now: new Date().toISOString(),
    });
  }

  function deleteCard(card: Card) {
    if (!window.confirm(`Delete "${card.title}"?`)) return;
    dispatch({ type: "card/delete", boardId, cardId: card.id });
  }

  return (
    <>
      {board.columns.length === 0 && (
        <p className="empty">This board has no columns yet. Add the first one below.</p>
      )}

      <div className="board-columns">
        {board.columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            onRenameColumn={renameColumn}
            onDeleteColumn={deleteColumn}
            onAddCard={addCard}
            onRenameCard={renameCard}
            onDeleteCard={deleteCard}
          />
        ))}
        <div className="add-column">
          <AddForm
            label="Add a column"
            placeholder="Column title"
            submitLabel="Add column"
            maxLength={LIMITS.columnTitle}
            onSubmit={addColumn}
          />
        </div>
      </div>
    </>
  );
}