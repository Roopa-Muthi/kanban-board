import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import { newId } from "../data/ids";
import { LIMITS } from "../data/model";
import type { Board } from "../data/model";
import { useDispatch, useSnapshot } from "../data/useStore";

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

function countCards(board: Board): number {
  return board.columns.reduce((total, column) => total + column.cards.length, 0);
}

export function BoardsPage() {
  const { data } = useSnapshot();
  const dispatch = useDispatch();
  const [name, setName] = useState("");

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
    <main style={{ maxWidth: 720, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Your boards</h1>
      <p style={{ color: "#5e6c84", fontSize: "0.9rem" }}>
        Saved in this browser only. Nothing is sent to a server.
      </p>

      <form onSubmit={handleCreate} style={{ display: "flex", gap: 8, margin: "1rem 0" }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New board name"
          maxLength={LIMITS.boardName}
          aria-label="New board name"
          style={{ flex: 1 }}
        />
        <button type="submit" disabled={name.trim() === ""}>
          Create board
        </button>
      </form>

      {data.boards.length === 0 ? (
        <p>You don't have any boards yet. Create your first one above.</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {data.boards.map((board) => (
            <li
              key={board.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.5rem 0",
              }}
            >
              <span>
                <Link to={`/boards/${board.id}`}>{board.name}</Link>{" "}
                <span style={{ color: "#5e6c84", fontSize: "0.85rem" }}>
                  {plural(board.columns.length, "column")} · {plural(countCards(board), "card")}
                </span>
              </span>
              <button onClick={() => handleDelete(board)} aria-label={`Delete board ${board.name}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}