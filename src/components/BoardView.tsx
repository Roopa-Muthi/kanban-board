import { useCallback, useEffect, useState } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  Announcements,
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  UniqueIdentifier,
} from "@dnd-kit/core";
import { newId } from "../data/ids";
import { LIMITS } from "../data/model";
import type { Board, Card, CardChanges, Column } from "../data/model";
import { useDispatch } from "../data/useStore";
import {
  buildLayout,
  cardKey,
  columnOfOver,
  describePlacement,
  parseCardKey,
  parseColumnKey,
  planMove,
  previewLayout,
  stepLayout,
} from "../dnd";
import type { Layout, Step } from "../dnd";
import { AddForm } from "./AddForm";
import { BoardColumn } from "./BoardColumn";
import { CardPreview } from "./CardPreview";
import { CardModal } from "./CardModal";

const KEYBOARD_INSTRUCTIONS =
  "Press Space or Enter to pick this card up. Use the arrow keys to move it: up and down " +
  "within a column, left and right between columns. Press Space or Enter to drop it, or " +
  "Escape to cancel.";

const STEP_KEYS: Record<string, Step> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

interface DragState {
  base: Board; // the board this started from; if it changes underneath, the preview is discarded
  cardId: string;
  start: Layout; // where everything was when the drag (or pick-up) began
  layout: Layout; // live preview
}

export function BoardView({ board }: { board: Board }) {
  const dispatch = useDispatch();
  const boardId = board.id;
  const [drag, setDrag] = useState<DragState | null>(null); // pointer drag preview
  const [grab, setGrab] = useState<DragState | null>(null); // keyboard pick-up preview
  const [announcement, setAnnouncement] = useState("");
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  // A preview is only valid for the board it started from. If another tab changes the board
  // meanwhile, the preview is ignored, so newly added cards never disappear behind it.
  const activeDrag = drag !== null && drag.base === board ? drag : null;
  const activeGrab = grab !== null && grab.base === board ? grab : null;

  const sensors = useSensors(
    // A small distance means a plain click on the handle never starts a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // A pick-up is only valid while focus stays on the card, so any pointer press cancels it.
  const grabbing = activeGrab !== null;
  useEffect(() => {
    if (!grabbing) return;
    const cancel = () => {
      setGrab(null);
      setAnnouncement("Move cancelled.");
    };
    document.addEventListener("pointerdown", cancel, true);
    return () => document.removeEventListener("pointerdown", cancel, true);
  }, [grabbing]);

  const cardsById = new Map(
    board.columns.flatMap((c) => c.cards).map((c): [string, Card] => [c.id, c]),
  );

  // Prefer the card under the pointer. If the pointer is over a column's empty space, pick the
  // nearest card in that column, or the column itself when it has no cards.
  const collisionDetection = useCallback<CollisionDetection>(
    (args) => {
      const hits = pointerWithin(args);
      const collisions = hits.length > 0 ? hits : rectIntersection(args);
      const overId = getFirstCollision(collisions, "id");
      if (overId === null) return [];

      const columnId = parseColumnKey(overId);
      if (columnId !== null) {
        const ids = activeDrag?.layout[columnId] ?? [];
        if (ids.length > 0) {
          const keys = new Set(ids.map(cardKey));
          const closest = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter((c) => keys.has(String(c.id))),
          });
          const first = closest[0];
          if (first) return [first];
        }
      }
      return [{ id: overId }];
    },
    [activeDrag],
  );

  // ---------- columns and cards ----------

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
  function saveCardDetails(cardId: string, changes: CardChanges) {
    dispatch({ type: "card/update", boardId, cardId, changes, now: new Date().toISOString() });
  }

  // ---------- pointer drag and drop ----------

  function handleDragStart({ active }: DragStartEvent) {
    const cardId = parseCardKey(active.id);
    if (cardId === null) return;
    const start = buildLayout(board.columns);
    setDrag({ base: board, cardId, start, layout: start });
  }

  // Preview only: when the card crosses into another column, move it there in the layout.
  function handleDragOver({ active, over }: DragOverEvent) {
    if (!activeDrag || !over) return;
    const cardId = parseCardKey(active.id);
    if (cardId === null) return;
    const translated = active.rect.current.translated;
    const below = translated !== null && translated.top > over.rect.top + over.rect.height / 2;
    const next = previewLayout(activeDrag.layout, cardId, over.id, below);
    if (next) setDrag({ ...activeDrag, layout: next });
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    const current = activeDrag;
    setDrag(null); // the preview ends; the real board is updated below
    if (!current || !over) return; // dropped outside everything: nothing changes

    const cardId = parseCardKey(active.id);
    if (cardId === null) return;
    const plan = planMove(current.start, current.layout, cardId, over.id);
    if (!plan) return;
    dispatch({ type: "card/place", boardId, cardId, columnId: plan.columnId, orderedIds: plan.ids });
  }

  function handleDragCancel() {
    setDrag(null);
  }

  // What screen readers hear during a pointer drag: titles and column names, not internal ids.
  const titleOf = (id: UniqueIdentifier): string => {
    const cardId = parseCardKey(id);
    return (cardId !== null ? cardsById.get(cardId)?.title : undefined) ?? "the card";
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => `Picked up ${titleOf(active.id)}.`,
    onDragOver: ({ active, over }) => {
      if (!over || !activeDrag) return undefined;
      const columnId = columnOfOver(activeDrag.layout, over.id);
      const column = board.columns.find((c) => c.id === columnId);
      return column ? `${titleOf(active.id)} is over ${column.title}.` : undefined;
    },
    onDragEnd: ({ active, over }) =>
      over
        ? `Dropped ${titleOf(active.id)}.`
        : `${titleOf(active.id)} was dropped outside the board and stays where it was.`,
    onDragCancel: ({ active }) => `Move cancelled. ${titleOf(active.id)} stays where it was.`,
  };

  // ---------- keyboard: pick up, step, drop ----------

  function cancelGrab(message: string) {
    setGrab(null);
    setAnnouncement(message);
  }

  function pickUp(card: Card) {
    if (activeDrag) return;
    const start = buildLayout(board.columns);
    setGrab({ base: board, cardId: card.id, start, layout: start });
    setAnnouncement(
      `Picked up ${card.title}, ${describePlacement(start, board.columns, card.id) ?? "on the board"}. ` +
        "Use the arrow keys to move it, Space to drop it, Escape to cancel.",
    );
  }

  function stepGrab(step: Step) {
    if (!activeGrab) return;
    const columnIds = board.columns.map((c) => c.id);
    const next = stepLayout(activeGrab.layout, columnIds, activeGrab.cardId, step);
    if (!next) {
      setAnnouncement(`Can't move any further ${step}.`);
      return;
    }
    setGrab({ ...activeGrab, layout: next });
    setAnnouncement(
      `Moved to ${describePlacement(next, board.columns, activeGrab.cardId) ?? "a new place"}.`,
    );
  }

  function dropGrab() {
    const current = activeGrab;
    if (!current) return;
    setGrab(null);
    const title = cardsById.get(current.cardId)?.title ?? "card";
    const plan = planMove(current.start, current.layout, current.cardId, cardKey(current.cardId));
    if (!plan) {
      setAnnouncement(`Dropped ${title}. Nothing changed.`);
      return;
    }
    dispatch({
      type: "card/place",
      boardId,
      cardId: current.cardId,
      columnId: plan.columnId,
      orderedIds: plan.ids,
    });
    const where = describePlacement(current.layout, board.columns, current.cardId);
    setAnnouncement(`Dropped ${title} at ${where ?? "its new place"}.`);
  }

  function handleHandleKeyDown(card: Card, e: KeyboardEvent<HTMLButtonElement>) {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (activeGrab?.cardId === card.id) dropGrab();
      else pickUp(card);
      return;
    }
    if (activeGrab?.cardId !== card.id) return;
    if (e.key === "Escape") {
      e.preventDefault();
      cancelGrab("Move cancelled.");
      return;
    }
    const step = STEP_KEYS[e.key];
    if (step) {
      e.preventDefault();
      stepGrab(step);
    }
  }

  // relatedTarget is null when the button was merely re-rendered or moved, which is not the
  // user leaving. Only a real jump to another element (Tab) cancels the pick-up.
  function handleHandleBlur(card: Card, e: FocusEvent<HTMLButtonElement>) {
    if (activeGrab?.cardId === card.id && e.relatedTarget !== null) cancelGrab("Move cancelled.");
  }

  // While dragging or holding a card, show the preview layout instead of the saved board.
  const preview = activeDrag ?? activeGrab;
  const columns: Column[] = preview
    ? board.columns.map((column) => ({
        ...column,
        cards: (preview.layout[column.id] ?? [])
          .map((id) => cardsById.get(id))
          .filter((c): c is Card => c !== undefined),
      }))
    : board.columns;
  const draggedCard = activeDrag ? cardsById.get(activeDrag.cardId) : undefined;
    // The dialog reads the saved board, never a drag preview. If the card is deleted elsewhere,
  // it disappears from the board and the dialog closes with it.
  const openCard = openCardId === null ? undefined : cardsById.get(openCardId);

  return (
    <>
      <p className="keyboard-hint">
        Keyboard: focus a card's ⠿ handle, press Space to pick it up, use the arrow keys to move
        it, then Space to drop it. Escape cancels.
      </p>
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {announcement}
      </div>

      {board.columns.length === 0 && (
        <p className="empty">This board has no columns yet. Add the first one below.</p>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        accessibility={{
          announcements,
          screenReaderInstructions: { draggable: KEYBOARD_INSTRUCTIONS },
        }}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="board-columns">
          {columns.map((column) => (
            <BoardColumn
              key={column.id}
              column={column}
              grabbedCardId={activeGrab?.cardId ?? null}
              onRenameColumn={renameColumn}
              onDeleteColumn={deleteColumn}
              onAddCard={addCard}
              onRenameCard={renameCard}
              onOpenCard={(card) => setOpenCardId(card.id)}
              onDeleteCard={deleteCard}
              onHandleKeyDown={handleHandleKeyDown}
              onHandleBlur={handleHandleBlur}
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
        <DragOverlay>{draggedCard ? <CardPreview card={draggedCard} /> : null}</DragOverlay>
      </DndContext>
      {openCard && (
        <CardModal
          key={openCard.id}
          card={openCard}
          onSave={(changes) => saveCardDetails(openCard.id, changes)}
          onClose={() => setOpenCardId(null)}
        />
      )}
    </>
  );
}