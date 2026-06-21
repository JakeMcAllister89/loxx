export type RangePreset = "today" | "week" | "month" | "last_month" | "quarter" | "year" | "all" | "custom";

export function presetRange(preset: RangePreset): { from: Date; to: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  switch (preset) {
    case "today":
      return { from: start, to: end };
    case "week": {
      const day = (now.getDay() + 6) % 7; // Mon = 0
      const from = new Date(start); from.setDate(start.getDate() - day);
      return { from, to: end };
    }
    case "month":
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: end };
    case "last_month":
      return {
        from: new Date(now.getFullYear(), now.getMonth() - 1, 1),
        to: new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999),
      };
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3) * 3;
      return { from: new Date(now.getFullYear(), q, 1), to: end };
    }
    case "year":
      return { from: new Date(now.getFullYear(), 0, 1), to: end };
    case "all":
      return { from: new Date(2000, 0, 1), to: end };
    default:
      return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: end };
  }
}

export function previousPeriod(from: Date, to: Date): { from: Date; to: Date } {
  const span = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - span - 1), to: new Date(from.getTime() - 1) };
}

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISODate(s: string, endOfDay = false): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1, endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
}
