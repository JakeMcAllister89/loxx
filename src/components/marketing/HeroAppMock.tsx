import { useEffect, useState } from "react";
import { Building2, ChevronRight, DoorClosed, Key, Layers, Search, Circle } from "lucide-react";

type DoorT = { id: string; label: string; keys: string[] };
type FloorT = { id: string; label: string; doors: DoorT[] };
type BuildingT = { id: string; label: string; floors: FloorT[] };

const BUILDINGS: BuildingT[] = [
  {
    id: "b1",
    label: "Riverside House",
    floors: [
      {
        id: "b1-f1",
        label: "Ground floor",
        doors: [
          { id: "d-101", label: "Main entrance", keys: ["GMK", "MK-A", "SMK-A1"] },
          { id: "d-102", label: "Reception", keys: ["GMK", "MK-A"] },
          { id: "d-103", label: "Post room", keys: ["GMK", "MK-A", "SMK-A1"] },
        ],
      },
      {
        id: "b1-f2",
        label: "First floor",
        doors: [
          { id: "d-201", label: "Office 201", keys: ["GMK", "MK-A"] },
          { id: "d-202", label: "Server room", keys: ["GMK"] },
          { id: "d-203", label: "Kitchen", keys: ["GMK", "MK-A", "SMK-A1"] },
        ],
      },
    ],
  },
  {
    id: "b2",
    label: "Meadow Wing",
    floors: [
      {
        id: "b2-f1",
        label: "Ground floor",
        doors: [
          { id: "d-301", label: "Side entrance", keys: ["GMK", "MK-B"] },
          { id: "d-302", label: "Plant room", keys: ["GMK"] },
        ],
      },
    ],
  },
];

const KEYS = [
  { id: "GMK", label: "GMK-001", holder: "Site Manager", access: "Grand master", status: "Issued", last: "12 Mar 2026" },
  { id: "MK-A", label: "MK-A-014", holder: "Facilities team", access: "Master — Riverside", status: "Issued", last: "04 Feb 2026" },
  { id: "SMK-A1", label: "SMK-A1-032", holder: "Cleaning contractor", access: "Sub-master — common areas", status: "Issued", last: "22 Jan 2026" },
  { id: "MK-B", label: "MK-B-007", holder: "Grounds team", access: "Master — Meadow Wing", status: "Issued", last: "09 Dec 2025" },
];

export function HeroAppMock() {
  const [selectedKey, setSelectedKey] = useState<string>("MK-A");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ b1: true, "b1-f1": true, "b1-f2": true, b2: false });

  // Gentle auto-cycle through keys and expand/collapse
  useEffect(() => {
    const order = ["MK-A", "GMK", "SMK-A1", "MK-B"];
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % order.length;
      const next = order[i];
      setSelectedKey(next);
      if (next === "MK-B") {
        setExpanded((e) => ({ ...e, b2: true, "b2-f1": true }));
      }
    }, 3200);
    return () => clearInterval(t);
  }, []);

  const key = KEYS.find((k) => k.id === selectedKey)!;
  const toggle = (id: string) => setExpanded((e) => ({ ...e, [id]: !e[id] }));
  const doorHighlighted = (d: DoorT) => d.keys.includes(selectedKey);

  return (
    <div className="relative">
      {/* Soft ambient glow */}
      <div className="absolute -inset-6 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 blur-3xl -z-10" />

      <div className="rounded-xl border border-border bg-card shadow-[0_30px_80px_-30px_rgba(0,0,0,0.25)] overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-muted/40">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
            <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          </div>
          <div className="mx-auto flex items-center gap-2 text-[11px] text-muted-foreground bg-background/70 border border-border rounded-md px-3 py-1">
            <Search className="h-3 w-3" /> my-loxx.app / systems / riverside-campus
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1.05fr_0.9fr] h-[420px]">
          {/* Column 1 — hierarchy */}
          <div className="border-r border-border p-3 overflow-hidden">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 pb-2">Hierarchy</div>
            <div className="space-y-0.5 text-sm">
              {BUILDINGS.map((b) => (
                <div key={b.id}>
                  <button
                    onClick={() => toggle(b.id)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted/60 transition-colors text-left"
                  >
                    <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-300 ${expanded[b.id] ? "rotate-90" : ""}`} />
                    <Building2 className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-foreground text-[13px]">{b.label}</span>
                  </button>
                  <div
                    className="overflow-hidden transition-all duration-500 ease-out"
                    style={{ maxHeight: expanded[b.id] ? 400 : 0, opacity: expanded[b.id] ? 1 : 0 }}
                  >
                    {b.floors.map((f) => (
                      <div key={f.id} className="ml-4">
                        <button
                          onClick={() => toggle(f.id)}
                          className="w-full flex items-center gap-1.5 px-2 py-1 rounded-md hover:bg-muted/60 transition-colors text-left"
                        >
                          <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform duration-300 ${expanded[f.id] ? "rotate-90" : ""}`} />
                          <Layers className="h-3 w-3 text-muted-foreground" />
                          <span className="text-[12px] text-foreground/80">{f.label}</span>
                        </button>
                        <div
                          className="overflow-hidden transition-all duration-500 ease-out"
                          style={{ maxHeight: expanded[f.id] ? 300 : 0, opacity: expanded[f.id] ? 1 : 0 }}
                        >
                          {f.doors.map((d) => {
                            const hit = doorHighlighted(d);
                            return (
                              <div
                                key={d.id}
                                className={`ml-5 flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] transition-all duration-300 ${
                                  hit ? "bg-primary/10 text-foreground" : "text-muted-foreground"
                                }`}
                              >
                                <DoorClosed className={`h-3 w-3 transition-colors ${hit ? "text-primary" : "text-muted-foreground/60"}`} />
                                <span className="truncate">{d.label}</span>
                                {hit && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Column 2 — keys list */}
          <div className="border-r border-border p-3 overflow-hidden bg-background/30">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-2 pb-2">Keys</div>
            <div className="space-y-1.5">
              {KEYS.map((k) => {
                const active = k.id === selectedKey;
                return (
                  <button
                    key={k.id}
                    onClick={() => setSelectedKey(k.id)}
                    className={`w-full text-left rounded-lg border px-3 py-2.5 transition-all duration-300 ${
                      active
                        ? "border-primary/40 bg-primary/[0.06] shadow-sm"
                        : "border-border bg-card hover:border-border/80 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex items-center justify-center h-7 w-7 rounded-md transition-colors ${
                          active ? "bg-primary/15" : "bg-muted/70"
                        }`}
                      >
                        <Key className={`h-3.5 w-3.5 ${active ? "text-primary" : "text-muted-foreground"}`} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[12px] font-semibold text-foreground truncate">{k.label}</div>
                        <div className="text-[10.5px] text-muted-foreground truncate">{k.access}</div>
                      </div>
                      {active && <ChevronRight className="h-3.5 w-3.5 text-primary" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Column 3 — details panel */}
          <div className="p-4 bg-card">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pb-2">Key details</div>
            <div key={key.id} className="animate-in fade-in duration-300">
              <div className="flex items-center gap-2.5">
                <span className="flex items-center justify-center h-9 w-9 rounded-lg bg-primary/15">
                  <Key className="h-4 w-4 text-primary" />
                </span>
                <div>
                  <div className="text-sm font-bold text-foreground">{key.label}</div>
                  <div className="text-[11px] text-muted-foreground">Key number</div>
                </div>
              </div>

              <dl className="mt-4 space-y-2.5 text-[12px]">
                <Row label="Current holder" value={key.holder} />
                <Row label="Access level" value={key.access} />
                <Row
                  label="Status"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                      {key.status}
                    </span>
                  }
                />
                <Row label="Last ordered" value={key.last} />
              </dl>

              <div className="mt-4 pt-3 border-t border-border">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Opens</div>
                <div className="mt-1.5 text-[11px] text-foreground/70">
                  {BUILDINGS.flatMap((b) => b.floors.flatMap((f) => f.doors)).filter((d) => d.keys.includes(selectedKey)).length}{" "}
                  doors across {BUILDINGS.filter((b) => b.floors.some((f) => f.doors.some((d) => d.keys.includes(selectedKey)))).length}{" "}
                  buildings
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground font-medium text-right">{value}</dd>
    </div>
  );
}
