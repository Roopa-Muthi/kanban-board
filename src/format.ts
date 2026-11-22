export const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? "" : "s"}`;

// A stable hue (0-359) per id, so every board keeps its own accent colour between visits.
export function accentHue(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return hash % 360;
}