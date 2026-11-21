import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

interface Props {
  label: string;
  placeholder: string;
  submitLabel: string;
  maxLength: number;
  onSubmit: (title: string) => void;
}

export function AddForm({ label, placeholder, submitLabel, maxLength, onSubmit }: Props) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    if (!open && restoreFocus.current) {
      restoreFocus.current = false;
      buttonRef.current?.focus();
    }
  }, [open]);

  function close() {
    restoreFocus.current = true;
    setOpen(false);
    setTitle("");
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setTitle(""); // stay open, so several cards can be added in a row
  }

  if (!open) {
    return (
      <button type="button" ref={buttonRef} className="add-btn" onClick={() => setOpen(true)}>
        + {label}
      </button>
    );
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <input
        autoFocus
        value={title}
        placeholder={placeholder}
        aria-label={placeholder}
        maxLength={maxLength}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") close();
        }}
      />
      <div className="form-actions">
        <button type="submit" disabled={title.trim() === ""}>
          {submitLabel}
        </button>
        <button type="button" onClick={close}>
          Cancel
        </button>
      </div>
    </form>
  );
}