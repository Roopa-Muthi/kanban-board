import { SCHEMA_VERSION } from "./model";
import type { AppData, Board, Card, Column } from "./model";

const KEY = "kanban.data";

export type LoadStatus = "ok" | "first-run" | "corrupt" | "unavailable";

export interface LoadResult {
  data: AppData;
  status: LoadStatus;
}

export function emptyData(): AppData {
  return { version: SCHEMA_VERSION, boards: [] };
}

// Reading window.localStorage can itself throw (blocked cookies, some private modes).
function defaultStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// ---------- validation: stored data is untrusted input ----------

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

const isString = (v: unknown): v is string => typeof v === "string";

function parseAll<T>(v: unknown, parse: (item: unknown) => T | null): T[] | null {
  if (!Array.isArray(v)) return null;
  const out: T[] = [];
  for (const item of v as unknown[]) {
    const parsed = parse(item);
    if (parsed === null) return null;
    out.push(parsed);
  }
  return out;
}

function parseCard(v: unknown): Card | null {
  if (!isRecord(v)) return null;
  const { id, title, description, dueDate, createdAt, updatedAt } = v;
  if (
    !isString(id) ||
    !isString(title) ||
    !isString(description) ||
    !(dueDate === null || isString(dueDate)) ||
    !isString(createdAt) ||
    !isString(updatedAt)
  ) {
    return null;
  }
  return { id, title, description, dueDate, createdAt, updatedAt };
}

function parseColumn(v: unknown): Column | null {
  if (!isRecord(v)) return null;
  const { id, title } = v;
  const cards = parseAll(v.cards, parseCard);
  if (!isString(id) || !isString(title) || cards === null) return null;
  return { id, title, cards };
}

function parseBoard(v: unknown): Board | null {
  if (!isRecord(v)) return null;
  const { id, name, createdAt } = v;
  const columns = parseAll(v.columns, parseColumn);
  if (!isString(id) || !isString(name) || !isString(createdAt) || columns === null) return null;
  return { id, name, createdAt, columns };
}

// Returns clean data, or null if anything is wrong. Unknown extra fields are dropped.
export function parseAppData(raw: unknown): AppData | null {
  if (!isRecord(raw) || raw.version !== SCHEMA_VERSION) return null;
  const boards = parseAll(raw.boards, parseBoard);
  if (boards === null) return null;

  // Duplicate ids would break drag and drop, so treat them as corruption.
  const seen = new Set<string>();
  for (const board of boards) {
    const ids = [board.id, ...board.columns.flatMap((c) => [c.id, ...c.cards.map((k) => k.id)])];
    for (const id of ids) {
      if (seen.has(id)) return null;
      seen.add(id);
    }
  }
  return { version: SCHEMA_VERSION, boards };
}

// ---------- load and save ----------

export function loadData(storage: Storage | null = defaultStorage()): LoadResult {
  if (storage === null) return { data: emptyData(), status: "unavailable" };

  let raw: string | null;
  try {
    raw = storage.getItem(KEY);
  } catch {
    return { data: emptyData(), status: "unavailable" };
  }
  if (raw === null) return { data: emptyData(), status: "first-run" };

  try {
    const parsed = parseAppData(JSON.parse(raw));
    if (parsed !== null) return { data: parsed, status: "ok" };
  } catch {
    // not JSON at all: handled below
  }

  // Unreadable: keep a copy so nothing is silently lost, then start clean.
  try {
    storage.setItem(`${KEY}.corrupt`, raw);
  } catch {
    // nothing more we can do
  }
  return { data: emptyData(), status: "corrupt" };
}

// Returns false when the browser refuses (quota exceeded, storage blocked).
export function saveData(data: AppData, storage: Storage | null = defaultStorage()): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

// ---------- export and import (used in Step 5) ----------

export function serialize(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function parseJson(text: string): AppData | null {
  try {
    return parseAppData(JSON.parse(text));
  } catch {
    return null;
  }
}