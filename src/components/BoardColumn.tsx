import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { FocusEvent, KeyboardEvent } from "react";
import { LIMITS } from "../data/model";
import type { Card, Column } from "../data/model";
import { cardKey, columnKey } from "../dnd";
import { AddForm } from "./AddForm";
import { CardItem } from "./CardItem";
import { EditableText } from "./EditableText";

interface Props {
  column: Column;
  grabbedCardId: string | null;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (column: Column) => void;
  onAddCard: (columnId: string, title: string) => void;
  onRenameCard: (cardId: string, title: string) => void;
  onOpenCard: (card: Card) => void;
  onDeleteCard: (card: Card) => void;
  onHandleKeyDown: (card: Card, e: KeyboardEvent<HTMLButtonElement>) => void;
  onHandleBlur: (card: Card, e: FocusEvent<HTMLButtonElement>) => void;
}

export function BoardColumn({
  column,
  grabbedCardId,
  onRenameColumn,
  onDeleteColumn,
  onAddCard,
  onRenameCard,
  onOpenCard,
  onDeleteCard,
  onHandleKeyDown,
  onHandleBlur,
}: Props) {
  // Makes the whole column a drop target, so an empty column can receive a card.
  const { setNodeRef } = useDroppable({ id: columnKey(column.id) });

  return (
    <section ref={setNodeRef} className="column" aria-label={column.title}>
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

      <SortableContext
        items={column.cards.map((c) => cardKey(c.id))}
        strategy={verticalListSortingStrategy}
      >
        {column.cards.length === 0 ? (
          <p className="empty">No cards yet</p>
        ) : (
          <ul className="card-list">
            {column.cards.map((card) => (
              <CardItem
                key={card.id}
                card={card}
                grabbed={card.id === grabbedCardId}
                onRename={(title) => onRenameCard(card.id, title)}
                onOpen={() => onOpenCard(card)}
                onDelete={() => onDeleteCard(card)}
                onHandleKeyDown={(e) => onHandleKeyDown(card, e)}
                onHandleBlur={(e) => onHandleBlur(card, e)}
              />
            ))}
          </ul>
        )}
      </SortableContext>

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