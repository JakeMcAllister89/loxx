/** Map finish name → on-card display colour (CSS hsl). */
export const FINISH_COLOR: Record<string, string> = {
  "Nickel Plated": "hsl(0 0% 78%)",
  "Satin Brass":   "hsl(45 60% 60%)",
  "Polished Brass":"hsl(40 65% 48%)",
  "Satin Chrome":  "hsl(210 6% 72%)",
};

export const FINISH_BORDER: Record<string, string> = {
  "Nickel Plated": "hsl(0 0% 60%)",
  "Satin Brass":   "hsl(45 55% 42%)",
  "Polished Brass":"hsl(40 60% 32%)",
  "Satin Chrome":  "hsl(210 6% 55%)",
};

export function colorForFinish(name?: string | null): string {
  if (!name) return "hsl(var(--muted-foreground))";
  return FINISH_COLOR[name] ?? "hsl(var(--muted-foreground))";
}
