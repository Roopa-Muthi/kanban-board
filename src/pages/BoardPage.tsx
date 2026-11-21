import { Link, useParams } from "react-router-dom";
import { useSnapshot } from "../data/useStore";
import "../board.css";

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data } = useSnapshot();
  const board = data.boards.find((b) => b.id === boardId);

  return (
    <main className="board-page">
      <p>
        <Link to="/">← All boards</Link>
      </p>
      {board ? (
        <>
          <h1>{board.name}</h1>
          <p className="empty">
            The board view comes back in Step 3. Columns: {board.columns.length}, cards:{" "}
            {board.columns.reduce((total, c) => total + c.cards.length, 0)}.
          </p>
        </>
      ) : (
        <p>Board not found.</p>
      )}
    </main>
  );
}