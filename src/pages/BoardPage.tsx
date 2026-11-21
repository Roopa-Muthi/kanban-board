import { Link, useParams } from "react-router-dom";
import { EditableText } from "../components/EditableText";
import { BoardView } from "../components/BoardView";
import { LIMITS } from "../data/model";
import { useDispatch, useSnapshot } from "../data/useStore";
import "../board.css";

export function BoardPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const { data } = useSnapshot();
  const dispatch = useDispatch();
  const board = data.boards.find((b) => b.id === boardId);

  return (
    <main className="board-page">
      <p>
        <Link to="/">← All boards</Link>
      </p>

      {board ? (
        <>
          <div className="board-header">
            <EditableText
              value={board.name}
              maxLength={LIMITS.boardName}
              editLabel={`Edit name of board ${board.name}`}
              className="board-title"
              headingLevel={1}
              onSave={(name) => dispatch({ type: "board/rename", boardId: board.id, name })}
            />
          </div>
          <BoardView board={board} />
        </>
      ) : (
        <p>Board not found.</p>
      )}
    </main>
  );
}