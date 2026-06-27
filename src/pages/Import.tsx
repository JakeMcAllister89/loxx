import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { CylinderConfigurator, ProductFull } from "@/components/builder/CylinderConfigurator";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  ParsedNode, buildTreeFromParsed, countByType,
  parseDomXl,
} from "@/lib/import";
import { TreeData, TNode } from "@/lib/keytree";
import { logAction } from "@/lib/audit";
import {
  Upload, ArrowLeft, ArrowRight, Loader2,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, FileSpreadsheet, Pencil,
} from "lucide-react";

type Step = "upload" | "review" | "build";
type Source = "csv" | "pdf" | "domxl";

type Product = ProductFull;

export default function ImportPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [parsedNodes, setParsedNodes] = useState<ParsedNode[]>([]);
  const [tree, setTree] = useState<TreeData | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [systemName, setSystemName] = useState("Imported system");
  const [products, setProducts] = useState<Product[]>([]);
  const [busy, setBusy] = useState(false);
  const [source, setSource] = useState<Source>("domxl");

  useEffect(() => {
    supabase.from("products").select("id,code,name,product_description,cylinder_type,cylinder_profile,pin_count,finish,size,price_gbp,bs_en_1303,description,image_url").eq("is_active", true).order("price_gbp").then(({ data }) => setProducts((data ?? []) as ProductFull[]));
  }, []);

  const goReview = (nodes: ParsedNode[], srcType: Source, suggestedName?: string) => {
    const { tree, warnings: buildWarnings } = buildTreeFromParsed(nodes);
    setParsedNodes(nodes);
    setTree(tree);
    setWarnings(buildWarnings);
    setSource(srcType);
    if (suggestedName) setSystemName(suggestedName);
    setStep("review");
  };

  const build = async () => {
    if (!user || !tree) return;
    setBusy(true);
    const ref = `IMPORT-${Math.floor(1000 + Math.random() * 9000)}`;
    const counts = countByType(tree);
    const { data, error } = await supabase
      .from("key_systems")
      .insert({
        user_id: user.id,
        name: systemName || "Imported system",
        reference: ref,
        tree_data: tree as any,
        door_count: counts.CYL,
        next_differ: tree.next_differ,
      })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) { toast.error("Failed to create system"); return; }

    logAction({ system_id: data.id, action: "system_created", node_label: systemName });
    logAction({
      system_id: data.id, action: "system_imported", node_label: systemName,
      metadata: { source, node_count: parsedNodes.length, cylinder_count: counts.CYL },
    });

    toast.success(`System imported — ${counts.CYL} doors ready to manage`);
    navigate(`/builder/${data.id}?imported=1`);
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Import existing system</h1>
          <p className="text-muted-foreground text-sm mt-1">Upload your DOM-XL file and we'll build the digital record for you.</p>
        </div>

        <Stepper step={step} warningCount={step === "review" ? warnings.length : 0} />

        {step === "upload" && (
          <UploadStep onParsed={(rows, name) => goReview(rows, "domxl", name)} />
        )}
        {step === "review" && tree && (
          <ReviewStep
            tree={tree}
            setTree={setTree}
            warnings={warnings}
            systemName={systemName}
            setSystemName={setSystemName}
            products={products}
            onBack={() => setStep("upload")}
            onBuild={() => { setStep("build"); build(); }}
          />
        )}
        {step === "build" && (
          <div className="rounded-[10px] border bg-card p-12 text-center shadow-card">
            {busy
              ? <><Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" /><div className="mt-3 text-sm">Building your system…</div></>
              : <><CheckCircle2 className="h-8 w-8 mx-auto text-success" /><div className="mt-3 text-sm">Done.</div></>}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

/* ----------------------------- Stepper ----------------------------- */

function Stepper({ step, warningCount = 0 }: { step: Step; warningCount?: number }) {
  const items: { key: Step; label: string }[] = [
    { key: "upload", label: "Upload" },
    { key: "review", label: "Review" },
    { key: "build", label: "Build" },
  ];
  const idx = items.findIndex((i) => i.key === step);
  return (
    <div className="flex items-center gap-2 mb-6">
      {items.map((it, i) => (
        <div key={it.key} className="flex items-center gap-2">
          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-medium ${
            i <= idx ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}>{i + 1}</div>
          <span className={`text-sm ${i === idx ? "font-semibold" : "text-muted-foreground"}`}>{it.label}</span>
          {it.key === "review" && step === "review" && warningCount > 0 && (
            <Badge className="bg-amber-100 text-amber-900 border-amber-300 text-[10px]">{warningCount} issue{warningCount !== 1 ? "s" : ""} to review</Badge>
          )}
          {i < items.length - 1 && <div className="w-10 h-px bg-border mx-2" />}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- Upload Step ----------------------------- */

function UploadStep({ onParsed }: { onParsed: (rows: ParsedNode[], systemName?: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const parse = async () => {
    if (!file) return;
    setBusy(true); setErr(null);
    try {
      const buf = await file.arrayBuffer();
      const { systemName, nodes, warnings } = parseDomXl(buf);
      warnings.forEach(w => toast.warning(w));
      onParsed(nodes, systemName);
    } catch (e: any) {
      setErr(e?.message ?? "Failed to parse file");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-[10px] border bg-card p-6 shadow-card flex flex-col">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Upload DOM-XL file</h2>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Upload the .xlsm file you received from your DOM locksmith or dealer.
        </p>

        <div
          className={`mt-4 min-h-[180px] rounded-[10px] border-2 border-dashed transition-colors cursor-pointer flex flex-col items-center justify-center text-sm text-muted-foreground p-6 ${
            dragging
              ? "border-primary bg-accent-light"
              : "border-border bg-background hover:bg-muted/40"
          }`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const dropped = e.dataTransfer.files?.[0];
            if (dropped) { setFile(dropped); setErr(null); }
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".xlsm"
            className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setErr(null); }}
          />
          <Upload className="h-7 w-7 mb-2" />
          {file
            ? <span className="text-foreground">{file.name} · {(file.size / 1024).toFixed(1)} KB</span>
            : <span>Drop your .xlsm file or click to browse</span>}
        </div>

        <button
          onClick={() => setShowHelp((s) => !s)}
          className="mt-3 text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground"
        >
          {showHelp ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          What is a DOM-XL file?
        </button>
        {showHelp && (
          <div className="text-xs text-muted-foreground mt-2 leading-relaxed bg-muted/40 rounded-md p-3">
            DOM-XL is the planning file DOM send you when your master key system is designed.
            It's the Excel file with a name like <code className="font-mono text-[11px]">YOURSITE.xlsm</code>.
            If you don't have it, contact your DOM dealer and ask for your DOM-XL file.
          </div>
        )}

        {err && (
          <div className="text-xs text-destructive mt-3">{err}</div>
        )}

        <Button onClick={parse} disabled={!file || busy} className="mt-4 bg-primary hover:bg-primary/90">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Upload file
        </Button>
      </div>
    </div>
  );
}

/* ----------------------------- Review Step ----------------------------- */

function ReviewStep({
  tree, setTree, warnings, systemName, setSystemName, products, onBack, onBuild,
}: {
  tree: TreeData;
  setTree: (t: TreeData) => void;
  warnings: string[];
  systemName: string;
  setSystemName: (s: string) => void;
  products: Product[];
  onBack: () => void;
  onBuild: () => void;
}) {
  const counts = useMemo(() => countByType(tree), [tree]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [draftPatch, setDraftPatch] = useState<Partial<TNode>>({});
  const [editingId, setEditingId] = useState<string | null>(null);

  const productCodes = useMemo(() => products.map(p => p.code), [products]);

  const zones = useMemo(() => {
    const result: { zoneId: string; zoneLabel: string; cyls: TNode[] }[] = [];
    const walkZone = (n: TNode) => {
      if (n.type === "SMK" || n.type === "GMK") {
        // Only collect DIRECT CYL children — do not recurse into nested nodes
        const cyls = n.children.filter(c => c.type === "CYL");
        if (cyls.length > 0) result.push({ zoneId: n.id, zoneLabel: n.label, cyls });
      }
      n.children.forEach(walkZone);
    };
    if (tree.root) walkZone(tree.root);
    return result;
  }, [tree]);

  const filteredZones = useMemo(() => {
    if (!search.trim()) return zones;
    const q = search.toLowerCase();
    return zones.map(z => ({
      ...z,
      cyls: z.cyls.filter(c => c.label.toLowerCase().includes(q)),
    })).filter(z => z.cyls.length > 0);
  }, [zones, search]);

  const allVisibleIds = useMemo(() =>
    filteredZones.flatMap(z => z.cyls.map(c => c.id)), [filteredZones]);

  const patchMany = useCallback((ids: string[], patch: Partial<TNode>) => {
    const idSet = new Set(ids);
    const walk = (n: TNode): TNode => idSet.has(n.id)
      ? { ...n, ...patch, children: n.children.map(walk) }
      : { ...n, children: n.children.map(walk) };
    setTree({ ...tree, root: tree.root ? walk(tree.root) : null });
  }, [setTree, tree]);

  const patchNode = useCallback((id: string, patch: Partial<TNode>) => {
    const walk = (n: TNode): TNode => n.id === id
      ? { ...n, ...patch }
      : { ...n, children: n.children.map(walk) };
    setTree({ ...tree, root: tree.root ? walk(tree.root) : null });
  }, [setTree, tree]);

  const repNode = useMemo((): TNode | null => {
    if (selectedIds.size === 0) return null;
    const allCyls = zones.flatMap(z => z.cyls);
    const sel = allCyls.filter(c => selectedIds.has(c.id));
    if (sel.length === 0) return null;
    const first = sel[0];
    const sharedFinish = sel.every(c => c.finish === first.finish) ? first.finish : undefined;
    const sharedSize = sel.every(c => (c as any).size === (first as any).size) ? (first as any).size : undefined;
    const sharedType = sel.every(c => c.cylinder_type === first.cylinder_type && !!c.cylinder_type) ? first.cylinder_type : undefined;
    return { ...first, finish: sharedFinish, size: sharedSize, cylinder_type: sharedType, ...draftPatch };
  }, [selectedIds, zones, draftPatch]);

  const handleConfigPatch = useCallback((patch: Partial<TNode>) => {
    setDraftPatch(prev => ({ ...prev, ...patch }));
  }, []);

  const assignToSelected = useCallback(() => {
    if (selectedIds.size === 0 || !draftPatch.cylinder_type) return;
    patchMany(Array.from(selectedIds), draftPatch);
    setSelectedIds(new Set());
    setDraftPatch({});
  }, [selectedIds, draftPatch, patchMany]);

  const toggleId = (id: string) => {
    setDraftPatch({});
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleZone = (cyls: TNode[]) => {
    setDraftPatch({});
    const ids = cyls.map(c => c.id);
    const allSelected = ids.every(id => selectedIds.has(id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (allSelected) ids.forEach(id => next.delete(id));
      else ids.forEach(id => next.add(id));
      return next;
    });
  };

  const selectAll = () => { setDraftPatch({}); setSelectedIds(new Set(allVisibleIds)); };
  const clearAll = () => { setDraftPatch({}); setSelectedIds(new Set()); };

  const confirmedCount = useMemo(() =>
    zones.flatMap(z => z.cyls).filter(c => !!c.cylinder_type && productCodes.includes(c.cylinder_type)).length,
    [zones, productCodes]);
  const totalCyls = counts.CYL;
  const allConfirmed = confirmedCount === totalCyls;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-[10px] border bg-card p-4 shadow-card flex items-center gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <Label className="text-xs">System name</Label>
          <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} className="mt-1" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Cylinders configured</span>
            <span className={allConfirmed ? "text-success font-medium" : ""}>{confirmedCount} / {totalCyls}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: totalCyls > 0 ? `${(confirmedCount / totalCyls) * 100}%` : "0%" }}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back</Button>
          <Button onClick={onBuild} className="bg-primary hover:bg-primary/90">
            Build system <ArrowRight className="h-3.5 w-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-[10px] border border-amber-300 bg-amber-50 p-3 shadow-card">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
            <ul className="text-xs text-amber-900/90 space-y-0.5 list-disc pl-3">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-[1fr_340px] gap-4 items-start">
        <div className="rounded-[10px] border bg-card shadow-card flex flex-col">
          <div className="flex items-center gap-2 p-3 border-b">
            <Input
              placeholder="Search doors…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-sm flex-1"
            />
            <Button variant="ghost" size="sm" className="text-xs h-8 px-2" onClick={selectAll}>All</Button>
            <Button variant="ghost" size="sm" className="text-xs h-8 px-2" onClick={clearAll}>None</Button>
            {selectedIds.size > 0 && (
              <span className="text-xs text-muted-foreground whitespace-nowrap">{selectedIds.size} selected</span>
            )}
          </div>
          <div className="overflow-auto max-h-[65vh] divide-y">
            {filteredZones.map(({ zoneId, zoneLabel, cyls }) => {
              const zoneAllSelected = cyls.every(c => selectedIds.has(c.id));
              const zoneSomeSelected = cyls.some(c => selectedIds.has(c.id));
              return (
                <div key={zoneId}>
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 sticky top-0 z-10">
                    <input
                      type="checkbox"
                      checked={zoneAllSelected}
                      ref={el => { if (el) el.indeterminate = zoneSomeSelected && !zoneAllSelected; }}
                      onChange={() => toggleZone(cyls)}
                      className="h-3.5 w-3.5 accent-primary"
                    />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{zoneLabel}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{cyls.filter(c => !!c.cylinder_type).length}/{cyls.length}</span>
                  </div>
                  {cyls.map(cyl => {
                    const isSelected = selectedIds.has(cyl.id);
                    const isConfirmed = !!cyl.cylinder_type && productCodes.includes(cyl.cylinder_type);
                    const hint = (cyl as any).dom_hint as string | undefined;
                    const size = (cyl as any).size as string | undefined;
                    return (
                      <div
                        key={cyl.id}
                        onClick={() => toggleId(cyl.id)}
                        className={`group flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors border-l-2 ${
                          isSelected
                            ? "bg-primary/10 border-primary"
                            : isConfirmed
                              ? "bg-green-50 border-green-300 hover:bg-green-100"
                              : "border-transparent hover:bg-muted/30"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleId(cyl.id)}
                          onClick={e => e.stopPropagation()}
                          className="h-3.5 w-3.5 accent-primary shrink-0"
                        />
                        {isConfirmed
                          ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                          : <span className="h-4 w-4 rounded-full border-2 border-amber-400 bg-amber-400/20 shrink-0" />
                        }
                        {editingId === cyl.id ? (
                          <Input
                            autoFocus
                            defaultValue={cyl.label}
                            className="h-7 text-sm flex-1 py-0"
                            onClick={e => e.stopPropagation()}
                            onBlur={e => {
                              const val = e.target.value.trim();
                              if (val && val !== cyl.label) patchNode(cyl.id, { label: val });
                              setEditingId(null);
                            }}
                            onKeyDown={e => {
                              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                              if (e.key === "Escape") setEditingId(null);
                            }}
                          />
                        ) : (
                          <span
                            className={`text-sm flex-1 truncate ${isConfirmed && !isSelected ? "text-green-700" : ""}`}
                            onDoubleClick={e => {
                              e.stopPropagation();
                              setEditingId(cyl.id);
                            }}
                            title="Double-click to rename"
                          >
                            {cyl.label}
                          </span>
                        )}
                        {editingId !== cyl.id && (
                          <button
                            onClick={e => { e.stopPropagation(); setEditingId(cyl.id); }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground shrink-0"
                            title="Rename door"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        )}

                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {isConfirmed
                            ? cyl.cylinder_type
                            : hint
                              ? `${hint}${size ? ` · ${size}` : ""}`
                              : "Unassigned"
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[10px] border bg-card shadow-card p-4 flex flex-col gap-4">
          {selectedIds.size === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="text-3xl mb-3">☑️</span>
              <p className="text-sm font-medium">Select doors to configure</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                Tick one or more doors on the left, then choose a cylinder spec and assign it.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  {selectedIds.size === 1
                    ? (() => { const allCyls = zones.flatMap(z => z.cyls); return allCyls.find(c => selectedIds.has(c.id))?.label ?? "1 door"; })()
                    : `${selectedIds.size} doors selected`}
                </p>
                <Button variant="ghost" size="sm" className="text-xs h-7 px-2" onClick={clearAll}>Clear</Button>
              </div>
              {repNode && (
                <CylinderConfigurator
                  node={repNode}
                  products={products}
                  onPatch={handleConfigPatch}
                />
              )}
              <Button
                className="w-full bg-primary hover:bg-primary/90 mt-2"
                disabled={!draftPatch.cylinder_type}
                onClick={assignToSelected}
              >
                Assign to {selectedIds.size} door{selectedIds.size !== 1 ? "s" : ""}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}



