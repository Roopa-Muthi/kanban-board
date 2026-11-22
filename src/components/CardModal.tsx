import { useEffect, useId, useRef, useState } from "react";
import type { FormEvent } from "react";
import { LIMITS } from "../data/model";
import type { Card, CardChanges } from "../data/model";

interface Draft {
  title: string;
  description: string;
  dueDate: string; // "" means no due date
}

function toDraft(card: Card): Draft {
  return { title: card.title, description: card.description, dueDate: card.dueDate ?? "" };
}

// Only what differs from the values the dialog opened with, so a save can't overwrite
// edits made to other fields in the meantime (for example in another tab).
function diff(base: Draft, draft: Draft): CardChanges {
  const changes: CardChanges = {};
  const title = draft.title.trim();
  if (title !== base.title.trim()) changes.title = title;
  if (draft.description !== base.description) changes.description = draft.description;
  if (draft.dueDate !== base.dueDate) changes.dueDate = draft.dueDate === "" ? null : draft.dueDate;
  return changes;
}

interface Props {
  card: Card;
  onSave: (changes: CardChanges) => void;
  onClose: () => void;
}

export function CardModal({ card, onSave, onClose }: Props) {
  const uid = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  // Whatever had focus when the dialog opened (the "Details" button), so it can get it back.
  const returnFocusRef = useRef<HTMLElement | null>(
    document.activeElement instanceof HTMLElement ? document.activeElement : null,
  );
  const [base] = useState<Draft>(() => toDraft(card));
  const [draft, setDraft] = useState<Draft>(base);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    const returnTo = returnFocusRef.current;
    return () => {
      returnTo?.focus();
    };
  }, []);

  const changes = diff(base, draft);
  const dirty = Object.keys(changes).length > 0;
  const titleBlank = draft.title.trim() === "";

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function requestClose() {
    if (dirty && !window.confirm("Discard your changes?")) return;
    onClose();
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!dirty || titleBlank) return;
    onSave(changes);
    onClose();
  }

  const headingId = `${uid}-heading`;

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      aria-labelledby={headingId}
      onCancel={(e) => {
        // Escape: ask first if there are unsaved changes.
        e.preventDefault();
        requestClose();
      }}
      onClose={() => {
        // Some browsers close a dialog on a second Escape even after preventDefault.
        // Keep it open: this component, not the browser, decides when it goes away.
        const dialog = dialogRef.current;
        if (dialog && !dialog.open) dialog.showModal();
      }}
      onClick={(e) => {
        // The form fills the dialog, so a click that lands on the dialog itself is the backdrop.
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <form className="modal-body" onSubmit={handleSubmit}>
        <h2 id={headingId}>Card details</h2>

        <div className="field">
          <label htmlFor={`${uid}-title`}>Title</label>
          <input
            id={`${uid}-title`}
            value={draft.title}
            maxLength={LIMITS.cardTitle}
            onChange={(e) => update("title", e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor={`${uid}-description`}>Description</label>
          <textarea
            id={`${uid}-description`}
            rows={6}
            value={draft.description}
            maxLength={LIMITS.description}
            onChange={(e) => update("description", e.target.value)}
          />
          <span className="hint">
            {draft.description.length} / {LIMITS.description}
          </span>
        </div>

        <div className="field">
          <label htmlFor={`${uid}-due`}>Due date</label>
          <div className="field-row">
            <input
              id={`${uid}-due`}
              type="date"
              value={draft.dueDate}
              onChange={(e) => update("dueDate", e.target.value)}
            />
            {draft.dueDate !== "" && (
              <button
                type="button"
                className="link-btn"
                aria-label="Clear due date"
                onClick={() => update("dueDate", "")}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" disabled={!dirty || titleBlank}>
            Save
          </button>
          <button type="button" onClick={requestClose}>
            Cancel
          </button>
        </div>
      </form>
    </dialog>
  );
}