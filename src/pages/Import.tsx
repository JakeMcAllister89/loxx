import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  parseDomXl,
} from "@/lib/import";
import { TreeData, TNode } from "@/lib/keytree";
import { logAction } from "@/lib/audit";
import {
  Upload, ArrowLeft, ArrowRight, Loader2,
  CheckCircle2, AlertTriangle, ChevronDown, ChevronRight, Trash2, FileSpreadsheet,
} from "lucide-react";

type Step = "upload" | "review" | "build";
type Source = "csv" | "pdf" | "domxl";

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
  const [source, setSource] = useState<Source>("domxl");

  useEffect(() => {
    supabase.from("products").select("id,code,name").eq("is_active", true).order("code").then(({ data }) => setProducts((data ?? []) as Product[]));
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

        <label className="mt-4 min-h-[180px] rounded-[10px] border-2 border-dashed border-border bg-background hover:bg-muted/40 cursor-pointer flex flex-col items-center justify-center text-sm text-muted-foreground transition-colors p-6">
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
        </label>

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
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Parse file
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
  const productCodes = useMemo(() => products.map((p) => p.code), [products]);

  const unmatchedGroups = useMemo(() => {
    const map = new Map<string, string[]>();
    const walk = (n: TNode | null) => {
      if (!n) return;
      if (n.type === "CYL" && n.cylinder_type) {
        const m = normalizeCylinderCode(n.cylinder_type, productCodes);
        if (!m.matched) {
          const arr = map.get(m.original) ?? [];
          arr.push(n.id);
          map.set(m.original, arr);
        }
      }
      n.children.forEach(walk);
    };
    walk(tree.root);
    return Array.from(map.entries()).map(([original, nodeIds]) => ({ original, nodeIds }));
  }, [tree, productCodes]);

  const patchNode = (id: string, patch: Partial<TNode>) => {
    const walk = (n: TNode): TNode => n.id === id
      ? { ...n, ...patch }
      : { ...n, children: n.children.map(walk) };
    setTree({ ...tree, root: tree.root ? walk(tree.root) : null });
  };

  const deleteNode = (id: string) => {
    const walk = (n: TNode): TNode => ({
      ...n,
      children: n.children.filter((c) => c.id !== id).map(walk),
    });
    setTree({ ...tree, root: tree.root ? walk(tree.root) : null });
  };

  return (
    <div className="grid md:grid-cols-[1fr_320px] gap-4">
      <div className="space-y-3">
        {warnings.length > 0 && (
          <div className="rounded-[10px] border border-amber-300 bg-amber-50 p-4 shadow-card">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-700 mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="text-sm font-semibold text-amber-900">
                  {warnings.length} issue{warnings.length !== 1 ? "s" : ""} to review before building
                </div>
                <ul className="text-xs text-amber-900/90 space-y-1 list-disc pl-4 mt-2">
                  {warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            </div>
          </div>
        )}
        <div className="rounded-[10px] border bg-card p-4 shadow-card max-h-[60vh] overflow-auto">
          {tree.root && <ReviewRow node={tree.root} depth={0} onRename={(id, label) => patchNode(id, { label })} onDelete={deleteNode} />}
        </div>
      </div>

      <div className="rounded-[10px] border bg-card p-5 shadow-card space-y-4 self-start">
        <div>
          <Label className="text-xs">System name</Label>
          <Input value={systemName} onChange={(e) => setSystemName(e.target.value)} />
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <div>{counts.GMK} grand master</div>
          <div>{counts.MK} master key{counts.MK !== 1 ? "s" : ""}</div>
          <div>{counts.SMK} sub master{counts.SMK !== 1 ? "s" : ""}</div>
          <div>{counts.CYL} cylinder{counts.CYL !== 1 ? "s" : ""}</div>
        </div>

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

function ReviewRow({ node, depth, onRename, onDelete }: { node: TNode; depth: number; onRename: (id: string, label: string) => void; onDelete: (id: string) => void }) {
  const colors: Record<string, string> = {
    GMK: "hsl(var(--node-gmk))", MK: "hsl(var(--node-mk))", SMK: "hsl(var(--node-smk))", CYL: "hsl(var(--node-cyl))", CK: "hsl(var(--node-ck))",
  };
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(node.label);
  return (
    <div>
      <div className="group flex items-center gap-2 py-1 text-sm" style={{ paddingLeft: depth * 16 }}>
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
        {node.type === "CYL" && (
          <button
            onClick={() => onDelete(node.id)}
            className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive p-1 rounded"
            title="Remove this door from the import"
            aria-label="Remove this door"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {node.children.map((c) => <ReviewRow key={c.id} node={c} depth={depth + 1} onRename={onRename} onDelete={onDelete} />)}
    </div>
  );
}
