export const SCHEMA_VERSION = 1;

export const LIMITS = {
  boardName: 200,
  columnTitle: 200,
  cardTitle: 300,
  description: 5000,
} as const;

export interface Card {
  id: string;
  title: string;
  description: string;
  dueDate: string | null; // "YYYY-MM-DD"
  createdAt: string; // ISO timestamps
  updatedAt: string;
}

export interface Column {
  id: string;
  title: string;
  cards: Card[]; // array order is display order
}

export interface Board {
  id: string;
  name: string;
  createdAt: string;
  columns: Column[]; // array order is display order
}

export interface AppData {
  version: typeof SCHEMA_VERSION;
  boards: Board[]; // newest first
}