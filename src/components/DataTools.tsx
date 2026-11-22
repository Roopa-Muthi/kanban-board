import { useState } from "react";
import type { ChangeEvent } from "react";
import { backupFilename, downloadText, readFileText } from "../data/files";
import { createSampleBoards } from "../data/sample";
import { emptyData, parseJson, serialize } from "../data/storage";
import { useDispatch, useSnapshot } from "../data/useStore";
import { plural } from "../format";

const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // roughly the browser's whole storage quota

interface Message {
  kind: "ok" | "error";
  text: string;
}

export function DataTools() {
  const { data } = useSnapshot();
  const dispatch = useDispatch();
  const [message, setMessage] = useState<Message | null>(null);

  function exportBackup() {
    downloadText(backupFilename(), serialize(data));
    setMessage({ kind: "ok", text: "Backup downloaded." });
  }

  async function importBackup(e: ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const file = input.files?.[0];
    input.value = ""; // so picking the same file again still triggers a change
    if (!file) return;
    setMessage(null);

    if (file.size > MAX_IMPORT_BYTES) {
      setMessage({ kind: "error", text: "That file is too large to be a Kanban backup." });
      return;
    }
    let text: string;
    try {
      text = await readFileText(file);
    } catch {
      setMessage({ kind: "error", text: "Couldn't read that file." });
      return;
    }
    const imported = parseJson(text);
    if (imported === null) {
      setMessage({
        kind: "error",
        text: "That file isn't a valid Kanban backup, so nothing was changed.",
      });
      return;
    }
    const incoming = plural(imported.boards.length, "board");
    if (
      !window.confirm(
        `Replace all your boards with the ${incoming} in this file? ` +
          "Your current boards will be lost unless you've exported a backup.",
      )
    ) {
      return;
    }
    dispatch({ type: "data/replace", data: imported });
    setMessage({ kind: "ok", text: `Imported ${incoming}.` });
  }

  function addSamples() {
    const boards = createSampleBoards();
    dispatch({ type: "boards/prepend", boards });
    setMessage({ kind: "ok", text: `Added ${plural(boards.length, "sample board")}.` });
  }

  function eraseAll() {
    if (
      !window.confirm(
        "Erase all your boards? This can't be undone. Export a backup first if you might want them back.",
      )
    ) {
      return;
    }
    dispatch({ type: "data/replace", data: emptyData() });
    setMessage({ kind: "ok", text: "All data erased." });
  }

  return (
    <section className="data-tools" aria-label="Your data">
      <h2>Your data</h2>
      <p className="data-tools-hint">
        Everything lives in this browser. Export a backup before clearing browser data or switching
        devices.
      </p>
      <div className="data-tools-actions">
        <button type="button" onClick={exportBackup}>
          Export backup
        </button>
        <label className="file-btn">
          Import from file…
          <input
            type="file"
            accept="application/json,.json"
            className="sr-only"
            onChange={(e) => void importBackup(e)}
          />
        </label>
        <button type="button" onClick={addSamples}>
          Add sample boards
        </button>
        <button type="button" className="danger-btn" onClick={eraseAll}>
          Erase all data
        </button>
      </div>
      {message && (
        <p
          role={message.kind === "error" ? "alert" : "status"}
          className={message.kind === "error" ? "error" : "data-ok"}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}