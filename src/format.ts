export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

// Curated accent hues (blues, teals, greens, purples, one orange). No reds or pinks, which read
// as errors next to a delete button.
export const BOARD_HUES = [215, 190, 168, 145, 262, 285, 28] as const;

// A stable palette hue per id, so every board keeps its own accent colour between visits.
export function accentHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return BOARD_HUES[hash % BOARD_HUES.length] ?? 215;
}