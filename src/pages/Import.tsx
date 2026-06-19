import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import {
  ParsedNode, buildTreeFromParsed, countByType, normalizeCylinderCode,
  downloadCsvTemplate,
} from "@/lib/import";
import { TreeData, TNode, NodeType } from "@/lib/keytree";
import { logAction } from "@/lib/audit";
import {
  Upload, FileText, FileSpreadsheet, ArrowLeft, ArrowRight, Loader2,
  CheckCircle2, AlertCircle, ChevronDown, ChevronRight,
} from "lucide-react";

// TODO: concierge import flow — accept emailed PDFs from customers and have a team member
// build the system for them when Claude cannot parse a scanned image PDF.

type Step = "upload" | "review" | "build";

interface Product { id: string; code: string; name: string }

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
  const [source, setSource] = useState<"csv" | "pdf">("csv");

  useEffect(() => {
    supabase.from("products").select("id,code,name").order("code").then(({ data }) => setProducts((data ?? []) as Product[]));
  }, []);

  const goReview = (nodes: ParsedNode[], srcType: "csv" | "pdf", suggestedName?: string) => {
    const { tree, warnings } = buildTreeFromParsed(nodes);
    setParsedNodes(nodes);
    setTree(tree);
    setWarnings(warnings);
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
          <p className="text-muted-foreground text-sm mt-1">Upload a lockchart PDF or CSV and we'll build the hierarchy for you.</p>
        </div>

        <Stepper step={step} />

        {step === "upload" && (
          <UploadStep onCsvParsed={(rows) => goReview(rows, "csv")} onPdfParsed={(rows, name) => goReview(rows, "pdf", name)} />
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

function Stepper({ step }: { step: Step }) {
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
          {i < items.length - 1 && <div className="w-10 h-px bg-border mx-2" />}
        </div>
      ))}
    </div>
  );
}

/* ----------------------------- Upload Step ----------------------------- */

function UploadStep({
  onCsvParsed, onPdfParsed,
}: {
  onCsvParsed: (rows: ParsedNode[]) => void;
  onPdfParsed: (rows: ParsedNode[], systemName?: string) => void;
}) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <CsvCard onParsed={onCsvParsed} />
      <PdfCard onParsed={onPdfParsed} />
    </div>
  );
}

function CsvCard({ onParsed }: { onParsed: (rows: ParsedNode[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [busy, setBusy] = useState(false);

  const parse = () => {
    if (!file) return;
    setBusy(true);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setBusy(false);
        const required = ["level"];
        const headers = res.meta.fields ?? [];
        for (const r of required) {
          if (!headers.includes(r)) { toast.error(`Column '${r}' is required but was not found in your file`); return; }
        }
        const rows: ParsedNode[] = res.data.map((r) => ({
          level: (r.level ?? "").trim() as NodeType,
          label: (r.label ?? "").trim(),
          parent_label: (r.parent_label ?? "").trim() || null,
          cylinder_type: (r.cylinder_type ?? "").trim() || null,
          finish: (r.finish ?? "").trim() || null,
          room_name: (r.room_name ?? "").trim() || null,
          key_ref: (r.key_ref ?? "").trim() || null,
          key_qty: r.key_qty ? Number(r.key_qty) : null,
        })).filter((r) => r.level || r.label);
        onParsed(rows);
      },
      error: () => { setBusy(false); toast.error("Couldn't parse CSV"); },
    });
  };

  return (
    <div className="rounded-[10px] border bg-card p-6 shadow-card flex flex-col">
      <div className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" /><h2 className="font-semibold">CSV upload</h2></div>
      <p className="text-xs text-muted-foreground mt-1">Best for structured lockchart spreadsheets.</p>

      <label className="mt-4 flex-1 min-h-[140px] rounded-[10px] border-2 border-dashed border-border bg-background hover:bg-muted/40 cursor-pointer flex flex-col items-center justify-center text-sm text-muted-foreground transition-colors p-4">
        <input ref={inputRef} type="file" accept=".csv" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Upload className="h-6 w-6 mb-2" />
        {file ? <span className="text-foreground">{file.name} · {(file.size / 1024).toFixed(1)} KB</span> : <span>Drop a .csv file or click to browse</span>}
      </label>

      <button onClick={() => downloadCsvTemplate()} className="text-xs text-primary hover:underline mt-3 text-left">
        Download CSV template
      </button>

      <button onClick={() => setShowHelp((s) => !s)} className="mt-2 text-xs text-muted-foreground flex items-center gap-1 hover:text-foreground">
        {showHelp ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />} How to fill this in
      </button>
      {showHelp && (
        <div className="text-[11px] text-muted-foreground mt-2 space-y-1 leading-relaxed">
          <div><b>level</b>: GMK, SMK, CK, or CYL</div>
          <div><b>label</b>: the node name (for CYL, use room_name instead)</div>
          <div><b>parent_label</b>: the label of the parent node</div>
          <div><b>cylinder_type</b>: product code for CYL rows (e.g. EKZ-12)</div>
          <div><b>finish</b>: e.g. N.P, S.C</div>
          <div><b>room_name</b>: door/room name (CYL only)</div>
          <div><b>key_ref / key_qty</b>: key reference and copies (CK rows)</div>
        </div>
      )}

      <Button onClick={parse} disabled={!file || busy} className="mt-4 bg-primary hover:bg-primary/90">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Parse this file
      </Button>
    </div>
  );
}

function PdfCard({ onParsed }: { onParsed: (rows: ParsedNode[], systemName?: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const parse = async () => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("File too large — maximum 10MB"); return; }
    setBusy(true); setErr(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const { data, error } = await supabase.functions.invoke("parse-lockchart", { body: form });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      const nodes: ParsedNode[] = (data?.nodes ?? []).map((n: any) => ({
        level: (n.level ?? "").toUpperCase() as NodeType,
        label: n.label ?? "",
        parent_label: n.parent_label ?? null,
        cylinder_type: n.cylinder_type ?? null,
        finish: n.finish ?? null,
        room_name: n.room_name ?? null,
        key_ref: n.key_ref ?? null,
        key_qty: n.key_qty ?? null,
      }));
      if (!nodes.length) throw new Error("No nodes extracted");
      onParsed(nodes, data?.system_name || file.name.replace(/\.pdf$/i, ""));
    } catch (e: any) {
      setBusy(false);
      setErr(e?.message ?? "Failed to parse PDF");
    }
  };

  return (
    <div className="rounded-[10px] border bg-card p-6 shadow-card flex flex-col">
      <div className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /><h2 className="font-semibold">PDF upload</h2></div>
      <p className="text-xs text-muted-foreground mt-1">Works on EVVA, Abloy, Mul-T-Lock and DOM lockchart formats.</p>

      <label className="mt-4 flex-1 min-h-[140px] rounded-[10px] border-2 border-dashed border-border bg-background hover:bg-muted/40 cursor-pointer flex flex-col items-center justify-center text-sm text-muted-foreground p-4">
        <input type="file" accept="application/pdf,.pdf" className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <Upload className="h-6 w-6 mb-2" />
        {file ? <span className="text-foreground">{file.name} · {(file.size / 1024).toFixed(1)} KB</span> : <span>Drop a .pdf file or click to browse</span>}
      </label>

      <div className="text-[11px] text-warning mt-3 flex items-start gap-1">
        <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
        <span>PDF parsing works on text-based PDFs. Scanned image PDFs may need manual correction in the next step.</span>
      </div>

      {err && (
        <div className="text-xs text-destructive mt-3">
          {err}. Try the CSV template or <a className="underline" href="mailto:support@iron-worx.co.uk">contact support</a>.
          <div className="mt-2"><Button size="sm" variant="outline" onClick={parse}>Retry</Button></div>
        </div>
      )}

      <Button onClick={parse} disabled={!file || busy} className="mt-4 bg-primary hover:bg-primary/90">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Parse this file
      </Button>
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
  const productCodes = useMemo(() => products.map((p) => p.code), [products]);

  // Unmatched cylinder codes
  const unmatched = useMemo(() => {
    const out: { nodeId: string; original: string }[] = [];
    const walk = (n: TNode | null) => {
      if (!n) return;
      if (n.type === "CYL" && n.cylinder_type) {
        const m = normalizeCylinderCode(n.cylinder_type, productCodes);
        if (!m.matched) out.push({ nodeId: n.id, original: m.original });
      }
      n.children.forEach(walk);
    };
    walk(tree.root);
    return out;
  }, [tree, productCodes]);

  const patchNode = (id: string, patch: Partial<TNode>) => {
    const walk = (n: TNode): TNode => n.id === id
      ? { ...n, ...patch }
      : { ...n, children: n.children.map(walk) };
    setTree({ ...tree, root: tree.root ? walk(tree.root) : null });
  };

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-4">
      {/* Tree preview */}
      <div className="rounded-[10px] border bg-card p-4 shadow-card max-h-[60vh] overflow-auto">
        {tree.root && <ReviewRow node={tree.root} depth={0} onRename={(id, label) => patchNode(id, { label })} />}
      </div>

      {/* Summary panel */}
      <div className="rounded-[10px] border bg-card p-5 shadow-card space-y-4 self-start">
        <div>
          <Label className="text-xs">System name</Label>
          <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} />
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div>{counts.GMK} grand master</div>
          <div>{counts.SMK} sub master{counts.SMK !== 1 ? "s" : ""}</div>
          <div>{counts.CK} change key{counts.CK !== 1 ? "s" : ""}</div>
          <div>{counts.CYL} cylinder{counts.CYL !== 1 ? "s" : ""}</div>
        </div>

        {warnings.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1">Issues found</div>
            <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pl-4">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}

        {unmatched.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1">Unmatched cylinder types</div>
            <div className="space-y-2">
              {unmatched.map((u) => (
                <div key={u.nodeId} className="flex items-center gap-2">
                  <Badge variant="destructive" className="font-mono text-[10px]">{u.original}</Badge>
                  <Select onValueChange={(v) => patchNode(u.nodeId, { cylinder_type: v })}>
                    <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="Select…" /></SelectTrigger>
                    <SelectContent>
                      {products.map((p) => <SelectItem key={p.id} value={p.code}>{p.code} — {p.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-3 border-t flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={onBack}><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
          <Button onClick={onBuild} className="bg-primary hover:bg-primary/90">Build system <ArrowRight className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ node, depth, onRename }: { node: TNode; depth: number; onRename: (id: string, label: string) => void }) {
  const colors: Record<NodeType, string> = {
    GMK: "hsl(var(--node-gmk))", SMK: "hsl(var(--node-smk))", CK: "hsl(var(--node-ck))", CYL: "hsl(var(--node-cyl))",
  };
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(node.label);
  return (
    <div>
      <div className="flex items-center gap-2 py-1 text-sm" style={{ paddingLeft: depth * 16 }}>
        <span className="h-2 w-2 rounded-full shrink-0" style={{ background: colors[node.type] }} />
        {editing ? (
          <Input
            autoFocus
            value={val}
            onChange={(e) => setVal(e.target.value)}
            onBlur={() => { setEditing(false); if (val !== node.label) onRename(node.id, val); }}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            className="h-6 text-sm w-64"
          />
        ) : (
          <button onClick={() => setEditing(true)} className="hover:underline truncate text-left">
            {node.label || <span className="italic text-muted-foreground">Unnamed</span>}
          </button>
        )}
        <span className="text-[10px] font-mono uppercase text-muted-foreground">{node.type}</span>
        {node.type === "CYL" && node.cylinder_type && (
          <span className="text-[10px] font-mono text-muted-foreground">· {node.cylinder_type}</span>
        )}
      </div>
      {node.children.map((c) => <ReviewRow key={c.id} node={c} depth={depth + 1} onRename={onRename} />)}
    </div>
  );
}
