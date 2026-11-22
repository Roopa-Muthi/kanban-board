import { toDayString } from "../dates";
import { newId } from "./ids";
import { SCHEMA_VERSION } from "./model";
import type { AppData, Board, Card, Column } from "./model";

interface CardSpec {
  title: string;
  description?: string;
  due?: number; // days from today; negative means overdue
}

interface BoardSpec {
  name: string;
  columns: [title: string, cards: CardSpec[]][];
}

const SPECS: BoardSpec[] = [
  {
    name: "Product launch",
    columns: [
      [
        "Backlog",
        [
          {
            title: "Plan the launch announcement",
            description: "Draft the blog post and the email to existing users.\nDecide who reviews it before it goes out.",
            due: 14,
          },
          { title: "Collect three customer quotes" },
          { title: "Translate the landing page", description: "Spanish and Hindi first.", due: 21 },
        ],
      ],
      [
        "In progress",
        [
          {
            title: "Build the pricing page",
            description: "Three tiers.\nMonthly and yearly toggle.",
            due: 3,
          },
          { title: "Fix the signup form on mobile", due: -2 },
          { title: "Set up error monitoring", description: "Alerts go to the team channel.", due: 5 },
        ],
      ],
      [
        "Review",
        [
          { title: "Write the onboarding emails", description: "A welcome email plus two follow-ups." },
          {
            title: "Check dashboard accessibility",
            description: "Keyboard navigation and colour contrast.",
            due: 1,
          },
        ],
      ],
      [
        "Done",
        [
          { title: "Choose a domain name" },
          { title: "Create the brand assets", description: "Logo, colours and a favicon." },
          { title: "Set up the staging environment" },
        ],
      ],
    ],
  },
  {
    name: "Weekend project",
    columns: [
      ["To do", [{ title: "Sketch the layout" }, { title: "Pick a colour palette", due: 2 }]],
      [
        "Doing",
        [{ title: "Build the first prototype", description: "Start with the main screen only." }],
      ],
      ["Done", []], // empty on purpose: shows the empty-column state
    ],
  },
];

export function createSampleBoards(now: Date = new Date(), makeId: () => string = newId): Board[] {
  const stamp = now.toISOString();
  const dayOffset = (days: number): string =>
    toDayString(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days));

  return SPECS.map(
    (spec): Board => ({
      id: makeId(),
      name: spec.name,
      createdAt: stamp,
      columns: spec.columns.map(
        ([title, cards]): Column => ({
          id: makeId(),
          title,
          cards: cards.map(
            (card): Card => ({
              id: makeId(),
              title: card.title,
              description: card.description ?? "",
              dueDate: card.due === undefined ? null : dayOffset(card.due),
              createdAt: stamp,
              updatedAt: stamp,
            }),
          ),
        }),
      ),
    }),
  );
}

export function createSampleData(now?: Date, makeId?: () => string): AppData {
  return { version: SCHEMA_VERSION, boards: createSampleBoards(now, makeId) };
}