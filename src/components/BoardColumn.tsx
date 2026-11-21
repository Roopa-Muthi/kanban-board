import { LIMITS } from "../data/model";
import type { Card, Column } from "../data/model";
import { AddForm } from "./AddForm";
import { CardItem } from "./CardItem";
import { EditableText } from "./EditableText";

interface Props {
  column: Column;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (column: Column) => void;
  onAddCard: (columnId: string, title: string) => void;
  onRenameCard: (cardId: string, title: string) => void;
  onDeleteCard: (card: Card) => void;
}

export function BoardColumn({
  column,
  onRenameColumn,
  onDeleteColumn,
  onAddCard,
  onRenameCard,
  onDeleteCard,
}: Props) {
  return (
    <section className="column" aria-label={column.title}>
      <header className="column-header">
        <EditableText
          value={column.title}
          maxLength={LIMITS.columnTitle}
          editLabel={`Edit name of column ${column.title}`}
          className="column-title"
          headingLevel={2}
          onSave={(title) => onRenameColumn(column.id, title)}
        />
        <span className="count">{column.cards.length}</span>
        <button
          type="button"
          className="link-btn danger"
          onClick={() => onDeleteColumn(column)}
          aria-label={`Delete column ${column.title}`}
        >
          Delete
        </button>
      </header>

      {column.cards.length === 0 ? (
        <p className="empty">No cards yet</p>
      ) : (
        <ul className="card-list">
          {column.cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              onRename={(title) => onRenameCard(card.id, title)}
              onDelete={() => onDeleteCard(card)}
            />
          ))}
        </ul>
      )}

      <AddForm
        label="Add a card"
        placeholder="Card title"
        submitLabel="Add card"
        maxLength={LIMITS.cardTitle}
        onSubmit={(title) => onAddCard(column.id, title)}
      />
    </section>
  );
}