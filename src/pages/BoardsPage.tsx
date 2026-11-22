import { useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Link } from "react-router-dom";
import { DataTools } from "../components/DataTools";
import { newId } from "../data/ids";
import { LIMITS } from "../data/model";
import type { Board } from "../data/model";
import { useDispatch, useSnapshot } from "../data/useStore";
import { accentHue, plural } from "../format";
import { useDocumentTitle } from "../useDocumentTitle";
import "../boards.css";

function countCards(board: Board): number {
  return board.columns.reduce((total, column) => total + column.cards.length, 0);
}

export function BoardsPage() {
  const { data } = useSnapshot();
  const dispatch = useDispatch();
  const [name, setName] = useState("");

  useDocumentTitle();

  function handleCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({ type: "board/add", id: newId(), name: trimmed, now: new Date().toISOString() });
    setName("");
  }

  function handleDelete(board: Board) {
    if (!window.confirm(`Delete "${board.name}" and everything in it?`)) return;
    dispatch({ type: "board/delete", boardId: board.id });
  }

  return (
    <main className="page">
      <div className="page-header">
        <h1>Your boards</h1>
        <p>Saved in this browser only. Nothing is sent to a server.</p>
      </div>

      <form className="new-board" onSubmit={handleCreate}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New board name"
          maxLength={LIMITS.boardName}
          aria-label="New board name"
        />
        <button type="submit" disabled={name.trim() === ""}>
          Create board
        </button>
      </form>

      {data.boards.length === 0 ? (
        <div className="empty-state">
          <strong>You don't have any boards yet.</strong>
          <span>Create your first one above, or add the sample boards below.</span>
        </div>
      ) : (
        <ul className="board-grid">
          {data.boards.map((board) => (
            <li
              key={board.id}
              className="board-card"
              style={{ "--hue": accentHue(board.id) } as CSSProperties}
            >
              <h2 className="board-card-title">
                <Link to={`/boards/${board.id}`}>{board.name}</Link>
              </h2>
              <p className="board-meta">
                {plural(board.columns.length, "column")} · {plural(countCards(board), "card")}
              </p>
              <div className="board-card-actions">
                <button
                  type="button"
                  className="btn-quiet danger"
                  onClick={() => handleDelete(board)}
                  aria-label={`Delete board ${board.name}`}
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <DataTools />
    </main>
  );
}