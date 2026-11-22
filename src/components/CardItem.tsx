import { useCallback, useEffect, useRef } from "react";
import type { FocusEvent, KeyboardEvent } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { LIMITS } from "../data/model";
import type { Card } from "../data/model";
import { formatDay, isOverdue } from "../dates";
import { cardKey } from "../dnd";
import { EditableText } from "./EditableText";

interface Props {
  card: Card;
  grabbed: boolean;
  onRename: (title: string) => void;
  onOpen: () => void;
  onDelete: () => void;
  onHandleKeyDown: (e: KeyboardEvent<HTMLButtonElement>) => void;
  onHandleBlur: (e: FocusEvent<HTMLButtonElement>) => void;
}

export function CardItem({
  card,
  grabbed,
  onRename,
  onOpen,
  onDelete,
  onHandleKeyDown,
  onHandleBlur,
}: Props) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: cardKey(card.id) });

  const handleRef = useRef<HTMLButtonElement | null>(null);
  const setHandleRef = useCallback(
    (node: HTMLButtonElement | null) => {
      handleRef.current = node;
      setActivatorNodeRef(node);
    },
    [setActivatorNodeRef],
  );

  // While this card is picked up with the keyboard, keep focus on its handle. Moving a card
  // to another column re-creates it, which would otherwise drop focus.
  useEffect(() => {
    if (grabbed) handleRef.current?.focus();
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    position: "relative" as const,
    zIndex: isDragging ? 1 : undefined,
    opacity: isDragging ? 0.6 : 1,
  };

  const dueLabel = card.dueDate ? formatDay(card.dueDate) : null;
  const overdue = card.dueDate ? isOverdue(card.dueDate) : false;

  return (
    <li ref={setNodeRef} style={style} className={grabbed ? "card grabbed" : "card"}>
      <div className="card-row">
        <button
          type="button"
          ref={setHandleRef}
          className="drag-handle"
          {...attributes}
          {...listeners}
          aria-pressed={grabbed}
          aria-roledescription={undefined}
          aria-label={`Reorder ${card.title}`}
          onKeyDown={onHandleKeyDown}
          onBlur={onHandleBlur}
        >
          ⠿
        </button>
        <EditableText
          value={card.title}
          maxLength={LIMITS.cardTitle}
          editLabel={`Edit title of ${card.title}`}
          className="card-title"
          onSave={onRename}
        />
      </div>
      {card.description && <p className="card-desc">{card.description}</p>}
      {dueLabel && (
        <p className={overdue ? "card-meta overdue" : "card-meta"}>
          Due {dueLabel}
          {overdue && " (overdue)"}
        </p>
      )}
      <div className="card-actions">
        <button
          type="button"
          className="link-btn"
          onClick={onOpen}
          aria-label={`Open details for ${card.title}`}
        >
          Details
        </button>
        <button
          type="button"
          className="link-btn danger"
          onClick={onDelete}
          aria-label={`Delete ${card.title}`}
        >
          Delete
        </button>
      </div>
    </li>
  );
}