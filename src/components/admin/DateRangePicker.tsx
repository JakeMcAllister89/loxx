import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { presetRange, RangePreset, toISODate, fromISODate } from "@/lib/dateRanges";

interface Props {
  from: Date;
  to: Date;
  preset: RangePreset;
  onChange: (from: Date, to: Date, preset: RangePreset) => void;
}

const presets: { id: RangePreset; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "quarter", label: "This quarter" },
  { id: "year", label: "This year" },
  { id: "all", label: "All time" },
];

export function DateRangePicker({ from, to, preset, onChange }: Props) {
  const pick = (p: RangePreset) => {
    const r = presetRange(p);
    onChange(r.from, r.to, p);
  };
  return (
    <div className="rounded-[10px] border bg-card p-4 shadow-card flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-xs uppercase text-muted-foreground">From</label>
        <Input
          type="date"
          value={toISODate(from)}
          onChange={(e) => onChange(fromISODate(e.target.value), to, "custom")}
          className="w-[160px]"
        />
        <label className="text-xs uppercase text-muted-foreground">To</label>
        <Input
          type="date"
          value={toISODate(to)}
          onChange={(e) => onChange(from, fromISODate(e.target.value, true), "custom")}
          className="w-[160px]"
        />
      </div>
      <div className="flex flex-wrap gap-1 ml-auto">
        {presets.map((p) => (
          <Button
            key={p.id}
            size="sm"
            variant={preset === p.id ? "default" : "outline"}
            onClick={() => pick(p.id)}
            className={preset === p.id ? "bg-primary hover:bg-primary/90" : ""}
          >
            {p.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
