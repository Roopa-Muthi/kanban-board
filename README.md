# Kanban Board

A Kanban board that runs entirely in your browser: drag cards between columns with the mouse,
touch or keyboard, edit details in a dialog, and back everything up as JSON. No account, no server.

**Live demo:** <your live URL>  ·  Built with React, TypeScript (strict), Vite and dnd-kit

![Screenshot of the board](docs/screenshot.png)

![CI](https://github.com/<your-username>/kanban-board/actions/workflows/ci.yml/badge.svg)

## Features

- Boards, columns and cards with add, rename and delete
- Drag and drop within and across columns, by pointer or touch (using the ⠿ handle)
- Keyboard moves: Space to pick up, arrow keys to move, Space to drop, Escape to cancel, with
  screen-reader announcements that use card titles and column names
- Card details dialog (description and due date) with a discard-changes check
- Everything is saved in your browser, stays in sync across tabs, and survives reloads
- Export and import of all data as JSON, with validation
- Sample boards on the first visit

## Run it locally

```bash
npm install
npm run dev
```

| Script | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm test` | Run the Vitest suite |
| `npm run lint` | ESLint |
| `npm run build` | Type-check and build to `dist/` |

## Technical decisions

- **A small external store instead of a state library.** A pure reducer holds all data, a tiny
  store wraps it, and React reads it with `useSyncExternalStore`. Every change is saved
  synchronously, so there are no loading or error states for ordinary edits.
- **Stored data is treated as untrusted input.** It carries a schema version and is validated on
  load. Unreadable or duplicate-id data is rejected, a copy of the old text is kept under a
  second key, and the app starts clean instead of crashing.
- **Order is array order.** Cards and columns have string UUIDs, and moving a card means
  rewriting the target column's array. There are no position numbers to maintain.
- **Drag logic is pure.** Previewing a move, planning a drop and stepping with the keyboard are
  plain functions with unit tests. jsdom can't simulate pointer drags, so the gesture itself is
  verified manually, and the keyboard path is tested end to end.
- **Previews are tied to the board they started from.** If another tab changes the board mid-drag,
  the preview is discarded, so new cards never disappear behind a stale preview.
- **The details dialog saves only the fields you changed**, so it can't overwrite edits made to
  other fields (for example in another tab). It uses the native `<dialog>` element for focus
  handling and Escape.
- **Import is validated like stored data**, capped at 5 MB, and asks before replacing anything.
- **Failures are visible.** If the browser blocks storage or refuses a write, a banner says
  changes won't persist.

## Testing

196 tests with Vitest and Testing Library: pure logic (move planning, reducer, storage
validation), components, page flows and full-app flows through the real router and store. CI runs
lint, tests and the build on every push.

## Known limitations

- Data lives in one browser. There's no sync between devices, so use export and import.
- Browsers limit `localStorage` to a few megabytes, which is plenty for boards and cards but not for attachments.
- Cards can only be dragged by their ⠿ handle, not from anywhere on the card.
- There's no undo, search or card labels.
- Transitions during drags don't respect `prefers-reduced-motion`.
- I've tested with the keyboard and Narrator, but haven't done a formal accessibility audit.

## A full-stack version

This started as a Django + PostgreSQL application with JWT authentication, a server-side move
endpoint and an OpenAPI-generated client. That version is here: <link to your full-stack repo>.