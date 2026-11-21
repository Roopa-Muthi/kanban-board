import { formatDay, isOverdue } from "../dates";
import { LIMITS } from "../data/model";
import type { Card } from "../data/model";
import { EditableText } from "./EditableText";

interface Props {
  card: Card;
  onRename: (title: string) => void;
  onDelete: () => void;
}

export function CardItem({ card, onRename, onDelete }: Props) {
  const dueLabel = card.dueDate ? formatDay(card.dueDate) : null;
  const overdue = card.dueDate ? isOverdue(card.dueDate) : false;

  return (
    <li className="card">
      <EditableText
        value={card.title}
        maxLength={LIMITS.cardTitle}
        editLabel={`Edit title of ${card.title}`}
        className="card-title"
        onSave={onRename}
      />
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