// Due dates are "YYYY-MM-DD". Parse the parts by hand: new Date("2026-11-05") is read as UTC
// and can show the wrong day in some time zones.
export function parseDay(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  // Rejects impossible dates like 2026-02-31, which Date would silently roll into March.
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

function startOfDay(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// A card due today isn't overdue until tomorrow.
export function isOverdue(iso: string, now: Date = new Date()): boolean {
  const due = parseDay(iso);
  return due !== null && due < startOfDay(now);
}

export function formatDay(iso: string): string | null {
  const date = parseDay(iso);
  if (!date) return null;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}