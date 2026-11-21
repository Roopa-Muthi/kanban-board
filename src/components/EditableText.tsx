import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

interface Props {
  value: string;
  maxLength: number;
  editLabel: string;
  className?: string;
  headingLevel?: number;
  onSave: (value: string) => void;
}

export function EditableText({ value, maxLength, editLabel, className, headingLevel, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  // After the form closes, put focus back on the Edit button so keyboard users keep their place.
  useEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false;
      editButtonRef.current?.focus();
    }
  }, [editing]);

  function start() {
    setDraft(value);
    setEditing(true);
  }

  function close() {
    restoreFocus.current = true;
    setEditing(false);
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed && trimmed !== value) onSave(trimmed); // blank or unchanged: just close
    close();
  }

  if (!editing) {
    const headingProps = headingLevel ? { role: "heading", "aria-level": headingLevel } : {};
    return (
      <span className="editable">
        <span className={className} {...headingProps}>
          {value}
        </span>
        <button
          type="button"
          ref={editButtonRef}
          className="link-btn"
          onClick={start}
          aria-label={editLabel}
        >
          Edit
        </button>
      </span>
    );
  }

  return (
    <form className="edit-form" onSubmit={handleSubmit}>
      <input
        autoFocus
        value={draft}
        maxLength={maxLength}
        aria-label={editLabel}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      />
      <div className="form-actions">
        <button type="submit">Save</button>
        <button type="button" onClick={close}>
          Cancel
        </button>
      </div>
    </form>
  );
}