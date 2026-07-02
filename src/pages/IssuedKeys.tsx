import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { ArrowLeft, Plus, Users, Search, History, MoreHorizontal, Archive } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TNode, TreeData } from "@/lib/keytree";
import { logAction } from "@/lib/audit";

type IssueStatus = "issued" | "returned" | "lost" | "resolved";
type HolderType = "employee" | "contractor" | "tenant" | "supplier" | "other";
type ResolutionType = "replacement_ordered" | "cylinder_replaced" | "system_rekeyed" | "risk_accepted" | "other";

interface Holder {
  id: string;
  org_id: string;
  name: string;
  holder_type: HolderType;
  department: string | null;
  email: string | null;
  phone: string | null;
  external_reference: string | null;
  notes: string | null;
  archived_at: string | null;
  archived_reason: string | null;
}

interface Issue {
  id: string;
  system_id: string;
  node_id: string;
  holder_id: string;
  quantity: number;
  status: IssueStatus;
  issued_at: string;
  issued_by: string | null;
  expected_return_date: string | null;
  returned_at: string | null;
  returned_by: string | null;
  lost_reported_at: string | null;
  lost_reported_by: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_type: ResolutionType | null;
  resolution_notes: string | null;
  replacement_order_id: string | null;
  notes: string | null;
  created_at: string;
}

interface NodeMeta { id: string; label: string; type: string; }

const HOLDER_TYPES: { value: HolderType; label: string }[] = [
  { value: "employee", label: "Employee" },
  { value: "contractor", label: "Contractor" },
  { value: "tenant", label: "Tenant" },
  { value: "supplier", label: "Supplier" },
  { value: "other", label: "Other" },
];

const RESOLUTION_TYPES: { value: ResolutionType; label: string }[] = [
  { value: "replacement_ordered", label: "Replacement ordered" },
  { value: "cylinder_replaced", label: "Cylinder replaced" },
  { value: "system_rekeyed", label: "System rekeyed" },
  { value: "risk_accepted", label: "Risk accepted" },
  { value: "other", label: "Other" },
];

function walkTree(root: TNode | null | undefined): NodeMeta[] {
  if (!root) return [];
  const out: NodeMeta[] = [];
  const w = (n: TNode) => {
    out.push({ id: n.id, label: n.label || "(unnamed)", type: n.type });
    n.children.forEach(w);
  };
  w(root);
  return out;
}

function statusBadge(s: IssueStatus) {
  const map: Record<IssueStatus, string> = {
    issued:   "bg-emerald-50 text-emerald-700 border-emerald-200",
    returned: "bg-slate-100 text-slate-700 border-slate-200",
    lost:     "bg-red-50 text-red-700 border-red-200",
    resolved: "bg-blue-50 text-blue-700 border-blue-200",
  };
  return <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${map[s]}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>;
}

function typeBadge(t: string) {
  const map: Record<string, string> = {
    GMK: "bg-[hsl(245_70%_96%)] text-[hsl(var(--node-gmk))] border-[hsl(var(--node-gmk))]/30",
    MK:  "bg-[hsl(178_70%_94%)] text-[hsl(var(--node-mk))] border-[hsl(var(--node-mk))]/30",
    SMK: "bg-[hsl(154_60%_95%)] text-[hsl(var(--node-smk))] border-[hsl(var(--node-smk))]/30",
    CYL: "bg-[hsl(36_94%_95%)] text-[hsl(var(--node-cyl))] border-[hsl(var(--node-cyl))]/30",
    CE:  "bg-[hsl(199_85%_94%)] text-[hsl(var(--node-ce))] border-[hsl(var(--node-ce))]/30",
  };
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${map[t] ?? "bg-muted"}`}>{t}</span>;
}

function holderBadge(t: HolderType) {
  return <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border bg-muted text-muted-foreground uppercase tracking-wide">{t}</span>;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function IssuedKeys() {
  const { id: systemId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, orgRole, orgId } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const readOnly = orgRole === "view_only";

  const [systemName, setSystemName] = useState("");
  const [treeNodes, setTreeNodes] = useState<NodeMeta[]>([]);
  const [holders, setHolders] = useState<Holder[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [tab, setTab] = useState<"issued" | "lost" | "history">("issued");
  const [fHolder, setFHolder] = useState<string>("all");
  const [fNode, setFNode] = useState<string>(searchParams.get("nodeId") ?? "all");
  const [fStatus, setFStatus] = useState<string>("all");
  const [fDept, setFDept] = useState<string>("all");
  const [fFrom, setFFrom] = useState<string>("");
  const [fTo, setFTo] = useState<string>("");

  // Dialog state
  const [issueOpen, setIssueOpen] = useState(false);
  const [holdersOpen, setHoldersOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState<Issue | null>(null);
  const [returnOf, setReturnOf] = useState<Issue | null>(null);
  const [lostOf, setLostOf] = useState<Issue | null>(null);
  const [lostNotes, setLostNotes] = useState("");
  const [resolveOf, setResolveOf] = useState<Issue | null>(null);
  const [resolveType, setResolveType] = useState<ResolutionType>("replacement_ordered");
  const [resolveNotes, setResolveNotes] = useState("");

  const loadAll = async () => {
    if (!systemId) return;
    setLoading(true);
    const [{ data: sys }, { data: hs }, { data: is }] = await Promise.all([
      supabase.from("key_systems").select("name,tree_data").eq("id", systemId).maybeSingle(),
      supabase.from("key_holders").select("*").order("name"),
      supabase.from("key_issues").select("*").eq("system_id", systemId).order("issued_at", { ascending: false }),
    ]);
    if (sys) {
      setSystemName((sys as any).name);
      const tree = (sys as any).tree_data as TreeData | null;
      setTreeNodes(walkTree(tree?.root ?? null));
    }
    setHolders((hs as any[] ?? []) as Holder[]);
    setIssues((is as any[] ?? []) as Issue[]);
    setLoading(false);
  };

  useEffect(() => { loadAll(); /* eslint-disable-next-line */ }, [systemId]);

  const nodeById = useMemo(() => new Map(treeNodes.map(n => [n.id, n])), [treeNodes]);
  const holderById = useMemo(() => new Map(holders.map(h => [h.id, h])), [holders]);
  const departments = useMemo(() => {
    const s = new Set<string>();
    holders.forEach(h => { if (h.department) s.add(h.department); });
    return Array.from(s).sort();
  }, [holders]);

  const filteredIssues = useMemo(() => {
    let rows = issues;
    if (tab === "issued") rows = rows.filter(r => r.status === "issued");
    else if (tab === "lost") rows = rows.filter(r => r.status === "lost");
    if (fHolder !== "all") rows = rows.filter(r => r.holder_id === fHolder);
    if (fNode !== "all") rows = rows.filter(r => r.node_id === fNode);
    if (fStatus !== "all") rows = rows.filter(r => r.status === fStatus);
    if (fDept !== "all") rows = rows.filter(r => holderById.get(r.holder_id)?.department === fDept);
    if (fFrom) rows = rows.filter(r => r.issued_at >= fFrom);
    if (fTo) rows = rows.filter(r => r.issued_at <= fTo + "T23:59:59");
    return rows;
  }, [issues, tab, fHolder, fNode, fStatus, fDept, fFrom, fTo, holderById]);

  // Actions
  const doReturn = async (i: Issue) => {
    if (!user) return;
    const { error } = await supabase.from("key_issues").update({
      status: "returned", returned_at: new Date().toISOString(), returned_by: user.id,
    } as any).eq("id", i.id);
    if (error) { toast.error(error.message); return; }
    const node = nodeById.get(i.node_id);
    const holder = holderById.get(i.holder_id);
    logAction({ system_id: systemId!, action: "key_returned", node_label: node?.label, metadata: { holder_name: holder?.name } });
    toast.success("Key marked returned");
    setReturnOf(null);
    loadAll();
  };

  const doLost = async () => {
    if (!user || !lostOf) return;
    const { error } = await supabase.from("key_issues").update({
      status: "lost", lost_reported_at: new Date().toISOString(), lost_reported_by: user.id,
      notes: lostNotes || lostOf.notes,
    } as any).eq("id", lostOf.id);
    if (error) { toast.error(error.message); return; }
    const node = nodeById.get(lostOf.node_id);
    const holder = holderById.get(lostOf.holder_id);
    logAction({ system_id: systemId!, action: "key_lost_reported", node_label: node?.label, metadata: { holder_name: holder?.name } });
    toast.success("Reported as lost");
    setLostOf(null); setLostNotes("");
    loadAll();
  };

  const doResolve = async () => {
    if (!user || !resolveOf) return;
    const { error } = await supabase.from("key_issues").update({
      status: "resolved", resolved_at: new Date().toISOString(), resolved_by: user.id,
      resolution_type: resolveType, resolution_notes: resolveNotes || null,
    } as any).eq("id", resolveOf.id);
    if (error) { toast.error(error.message); return; }
    const node = nodeById.get(resolveOf.node_id);
    logAction({ system_id: systemId!, action: "key_resolved", node_label: node?.label, metadata: { resolution_type: resolveType } });
    toast.success("Marked resolved");
    setResolveOf(null); setResolveNotes(""); setResolveType("replacement_ordered");
    loadAll();
  };

  const rowHistory = (i: Issue) =>
    issues.filter(r => r.node_id === i.node_id && r.holder_id === i.holder_id)
          .sort((a, b) => a.issued_at.localeCompare(b.issued_at));

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <div className="mb-2">
          <Link to={`/builder/${systemId}`} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to system
          </Link>
        </div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Issued Keys</h1>
            <p className="text-muted-foreground text-sm mt-1">{systemName || "System"} — track who holds which keys.</p>
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setHoldersOpen(true)}><Users className="h-4 w-4" /> Manage Holders</Button>
              <Button onClick={() => setIssueOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white"><Plus className="h-4 w-4" /> Issue Key</Button>
            </div>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList>
            <TabsTrigger value="issued">Currently Issued</TabsTrigger>
            <TabsTrigger value="lost">Lost / Unresolved</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Filters */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-6 gap-2">
            <Select value={fHolder} onValueChange={setFHolder}>
              <SelectTrigger><SelectValue placeholder="Holder" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All holders</SelectItem>
                {holders.filter(h => !h.archived_at).map(h => <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fNode} onValueChange={(v) => {
              setFNode(v);
              if (v === "all") { searchParams.delete("nodeId"); } else { searchParams.set("nodeId", v); }
              setSearchParams(searchParams);
            }}>
              <SelectTrigger><SelectValue placeholder="Key / Node" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All keys</SelectItem>
                {treeNodes.map(n => <SelectItem key={n.id} value={n.id}>{n.type} · {n.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={fStatus} onValueChange={setFStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="returned">Returned</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
              </SelectContent>
            </Select>
            <Select value={fDept} onValueChange={setFDept}>
              <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input type="date" value={fFrom} onChange={(e) => setFFrom(e.target.value)} placeholder="From" />
            <Input type="date" value={fTo} onChange={(e) => setFTo(e.target.value)} placeholder="To" />
          </div>

          <TabsContent value={tab} className="mt-4">
            <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-medium">Key / Node</th>
                    {!readOnly && <th className="text-left px-4 py-2.5 font-medium">Holder</th>}
                    <th className="text-left px-4 py-2.5 font-medium">Qty</th>
                    <th className="text-left px-4 py-2.5 font-medium">Status</th>
                    <th className="text-left px-4 py-2.5 font-medium">Issued</th>
                    <th className="text-left px-4 py-2.5 font-medium">Expected return</th>
                    <th className="text-right px-4 py-2.5 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">Loading…</td></tr>
                  ) : filteredIssues.length === 0 ? (
                    <tr><td colSpan={7} className="text-center p-8 text-muted-foreground">No records</td></tr>
                  ) : filteredIssues.map(i => {
                    const node = nodeById.get(i.node_id);
                    const holder = holderById.get(i.holder_id);
                    return (
                      <tr key={i.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {node ? typeBadge(node.type) : null}
                            <span className="font-medium">{node?.label ?? "—"}</span>
                          </div>
                        </td>
                        {!readOnly && (
                          <td className="px-4 py-2.5">
                            {holder ? (
                              <div className="flex items-center gap-2">
                                <span>{holder.name}</span>
                                {holderBadge(holder.holder_type)}
                              </div>
                            ) : "—"}
                          </td>
                        )}
                        <td className="px-4 py-2.5">{i.quantity}</td>
                        <td className="px-4 py-2.5">{statusBadge(i.status)}</td>
                        <td className="px-4 py-2.5">{fmtDate(i.issued_at)}</td>
                        <td className="px-4 py-2.5 text-muted-foreground">{fmtDate(i.expected_return_date)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {!readOnly && i.status === "issued" && (
                                <>
                                  <DropdownMenuItem onClick={() => setReturnOf(i)}>Return</DropdownMenuItem>
                                  <DropdownMenuItem className="text-red-600" onClick={() => setLostOf(i)}>Report lost</DropdownMenuItem>
                                </>
                              )}
                              {!readOnly && i.status === "lost" && (
                                <DropdownMenuItem onClick={() => setResolveOf(i)}>Resolve</DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setHistoryOpen(i)}>
                                <History className="h-3.5 w-3.5" /> View history
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Issue key dialog */}
      {!readOnly && (
        <IssueKeyDialog
          open={issueOpen}
          onOpenChange={setIssueOpen}
          treeNodes={treeNodes}
          holders={holders.filter(h => !h.archived_at)}
          orgId={orgId}
          userId={user?.id ?? null}
          systemId={systemId!}
          initialNodeId={fNode !== "all" ? fNode : null}
          onCreated={loadAll}
          onHolderCreated={loadAll}
        />
      )}

      {/* Manage holders dialog */}
      {!readOnly && (
        <ManageHoldersDialog
          open={holdersOpen}
          onOpenChange={setHoldersOpen}
          holders={holders}
          orgId={orgId}
          userId={user?.id ?? null}
          onChanged={loadAll}
        />
      )}

      {/* Return confirm */}
      <AlertDialog open={!!returnOf} onOpenChange={(o) => !o && setReturnOf(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark key returned?</AlertDialogTitle>
            <AlertDialogDescription>
              This closes out the current issue. It stays in history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => returnOf && doReturn(returnOf)} className="bg-amber-500 hover:bg-amber-600 text-white">Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Report lost */}
      <Dialog open={!!lostOf} onOpenChange={(o) => { if (!o) { setLostOf(null); setLostNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Report key as lost</DialogTitle>
            <DialogDescription>The row will move to Lost / Unresolved until resolved.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea value={lostNotes} onChange={(e) => setLostNotes(e.target.value)} placeholder="e.g. Last seen at reception on Friday" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLostOf(null)}>Cancel</Button>
            <Button onClick={doLost} className="bg-red-600 hover:bg-red-700 text-white">Report lost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Resolve */}
      <Dialog open={!!resolveOf} onOpenChange={(o) => { if (!o) { setResolveOf(null); setResolveNotes(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve lost key</DialogTitle>
            <DialogDescription>How was the risk from this lost key handled?</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Resolution</Label>
              <Select value={resolveType} onValueChange={(v) => setResolveType(v as ResolutionType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RESOLUTION_TYPES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={resolveNotes} onChange={(e) => setResolveNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveOf(null)}>Cancel</Button>
            <Button onClick={doResolve} className="bg-amber-500 hover:bg-amber-600 text-white">Resolve</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History drawer */}
      <Sheet open={!!historyOpen} onOpenChange={(o) => !o && setHistoryOpen(null)}>
        <SheetContent className="w-[440px] sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Issue history</SheetTitle>
          </SheetHeader>
          {historyOpen && (
            <div className="mt-4 space-y-3">
              <div className="text-sm">
                <div className="text-muted-foreground">Key</div>
                <div className="font-medium">{nodeById.get(historyOpen.node_id)?.label ?? "—"}</div>
              </div>
              {!readOnly && (
                <div className="text-sm">
                  <div className="text-muted-foreground">Holder</div>
                  <div className="font-medium">{holderById.get(historyOpen.holder_id)?.name ?? "—"}</div>
                </div>
              )}
              <div className="border-t pt-3 space-y-2">
                {rowHistory(historyOpen).map(h => (
                  <div key={h.id} className="rounded border p-2.5 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      {statusBadge(h.status)}
                      <span className="text-muted-foreground">{fmtDate(h.issued_at)}</span>
                    </div>
                    <div>Qty {h.quantity}</div>
                    {h.returned_at && <div className="text-muted-foreground">Returned {fmtDate(h.returned_at)}</div>}
                    {h.lost_reported_at && <div className="text-red-600">Lost reported {fmtDate(h.lost_reported_at)}</div>}
                    {h.resolved_at && <div className="text-blue-600">Resolved {fmtDate(h.resolved_at)} — {h.resolution_type}</div>}
                    {h.notes && <div className="text-muted-foreground italic">"{h.notes}"</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}

/* ---------------- Issue Key dialog ---------------- */

function IssueKeyDialog({
  open, onOpenChange, treeNodes, holders, orgId, userId, systemId, initialNodeId, onCreated, onHolderCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  treeNodes: NodeMeta[];
  holders: Holder[];
  orgId: string | null;
  userId: string | null;
  systemId: string;
  initialNodeId: string | null;
  onCreated: () => void;
  onHolderCreated: () => void;
}) {
  const [nodeId, setNodeId] = useState<string>("");
  const [holderId, setHolderId] = useState<string>("");
  const [qty, setQty] = useState<number>(1);
  const [expected, setExpected] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [holderSearch, setHolderSearch] = useState("");
  const [newOpen, setNewOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setNodeId(initialNodeId ?? "");
      setHolderId(""); setQty(1); setExpected(""); setNotes(""); setHolderSearch("");
    }
  }, [open, initialNodeId]);

  const filteredHolders = useMemo(() => {
    const q = holderSearch.trim().toLowerCase();
    if (!q) return holders;
    return holders.filter(h => h.name.toLowerCase().includes(q) || (h.department ?? "").toLowerCase().includes(q));
  }, [holders, holderSearch]);

  const submit = async () => {
    if (!nodeId || !holderId || !userId) { toast.error("Pick a key and a holder"); return; }
    setBusy(true);
    const { error } = await supabase.from("key_issues").insert({
      system_id: systemId, node_id: nodeId, holder_id: holderId,
      quantity: qty, status: "issued",
      issued_at: new Date().toISOString(), issued_by: userId,
      expected_return_date: expected || null,
      notes: notes || null,
    } as any);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const node = treeNodes.find(n => n.id === nodeId);
    const holder = holders.find(h => h.id === holderId);
    logAction({ system_id: systemId, action: "key_issued", node_label: node?.label, metadata: { holder_name: holder?.name, quantity: qty } });
    toast.success("Key issued");
    onOpenChange(false);
    onCreated();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Issue a key</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Key / Node</Label>
              <Select value={nodeId} onValueChange={setNodeId}>
                <SelectTrigger><SelectValue placeholder="Select a key" /></SelectTrigger>
                <SelectContent>
                  {treeNodes.map(n => <SelectItem key={n.id} value={n.id}>{n.type} · {n.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Holder</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input className="pl-7" placeholder="Search holders…" value={holderSearch} onChange={(e) => setHolderSearch(e.target.value)} />
              </div>
              <div className="border rounded max-h-40 overflow-auto">
                {filteredHolders.length === 0 ? (
                  <div className="p-3 text-xs text-muted-foreground">No holders found.</div>
                ) : filteredHolders.map(h => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setHolderId(h.id)}
                    className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted flex items-center justify-between ${holderId === h.id ? "bg-amber-50" : ""}`}
                  >
                    <span>{h.name}{h.department ? <span className="text-muted-foreground"> · {h.department}</span> : null}</span>
                    {holderBadge(h.holder_type)}
                  </button>
                ))}
              </div>
              <Button type="button" size="sm" variant="ghost" className="text-amber-700" onClick={() => setNewOpen(true)}>
                <Plus className="h-3.5 w-3.5" /> New holder
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} />
              </div>
              <div className="space-y-1.5">
                <Label>Expected return (optional)</Label>
                <Input type="date" value={expected} onChange={(e) => setExpected(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={submit} disabled={busy} className="bg-amber-500 hover:bg-amber-600 text-white">Issue key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <HolderFormDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        orgId={orgId}
        userId={userId}
        onSaved={() => { onHolderCreated(); }}
      />
    </>
  );
}

/* ---------------- Manage Holders dialog ---------------- */

function ManageHoldersDialog({
  open, onOpenChange, holders, orgId, userId, onChanged,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  holders: Holder[];
  orgId: string | null;
  userId: string | null;
  onChanged: () => void;
}) {
  const [showArchived, setShowArchived] = useState(false);
  const [formOpen, setFormOpen] = useState<{ mode: "create" } | { mode: "edit"; holder: Holder } | null>(null);
  const [archiveOf, setArchiveOf] = useState<Holder | null>(null);
  const [archiveReason, setArchiveReason] = useState("");

  const list = holders.filter(h => showArchived ? true : !h.archived_at);

  const doArchive = async () => {
    if (!archiveOf || !userId) return;
    const { error } = await supabase.from("key_holders").update({
      archived_at: new Date().toISOString(), archived_by: userId,
      archived_reason: archiveReason || null,
    } as any).eq("id", archiveOf.id);
    if (error) { toast.error(error.message); return; }
    logAction({ action: "key_holder_archived", metadata: { holder_name: archiveOf.name, reason: archiveReason } });
    toast.success("Holder archived");
    setArchiveOf(null); setArchiveReason("");
    onChanged();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Key holders</DialogTitle>
            <DialogDescription>Employees, contractors and other people who hold keys.</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between mb-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              Show archived
            </label>
            <Button size="sm" onClick={() => setFormOpen({ mode: "create" })} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Plus className="h-4 w-4" /> New holder
            </Button>
          </div>
          <div className="border rounded max-h-[400px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2 font-medium">Name</th>
                  <th className="text-left px-3 py-2 font-medium">Type</th>
                  <th className="text-left px-3 py-2 font-medium">Department</th>
                  <th className="text-right px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">No holders yet.</td></tr>
                ) : list.map(h => (
                  <tr key={h.id} className={`border-t ${h.archived_at ? "opacity-60" : ""}`}>
                    <td className="px-3 py-2">
                      {h.name}
                      {h.archived_at && <span className="ml-2 text-[10px] text-muted-foreground">(archived)</span>}
                    </td>
                    <td className="px-3 py-2">{holderBadge(h.holder_type)}</td>
                    <td className="px-3 py-2 text-muted-foreground">{h.department ?? "—"}</td>
                    <td className="px-3 py-2 text-right">
                      {!h.archived_at && (
                        <div className="inline-flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => setFormOpen({ mode: "edit", holder: h })}>Edit</Button>
                          <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setArchiveOf(h)}>
                            <Archive className="h-3.5 w-3.5" /> Archive
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>

      <HolderFormDialog
        open={!!formOpen}
        onOpenChange={(o) => !o && setFormOpen(null)}
        holder={formOpen?.mode === "edit" ? formOpen.holder : null}
        orgId={orgId}
        userId={userId}
        onSaved={() => { setFormOpen(null); onChanged(); }}
      />

      <Dialog open={!!archiveOf} onOpenChange={(o) => { if (!o) { setArchiveOf(null); setArchiveReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive holder</DialogTitle>
            <DialogDescription>
              Their history of issued keys stays intact. They won't appear in new-issue dropdowns.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea value={archiveReason} onChange={(e) => setArchiveReason(e.target.value)} placeholder="e.g. Left the company" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setArchiveOf(null)}>Cancel</Button>
            <Button onClick={doArchive} className="bg-red-600 hover:bg-red-700 text-white">Archive</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ---------------- Holder Form dialog ---------------- */

function HolderFormDialog({
  open, onOpenChange, holder = null, orgId, userId, onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  holder?: Holder | null;
  orgId: string | null;
  userId: string | null;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<HolderType>("employee");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ref, setRef] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setName(holder?.name ?? "");
      setType((holder?.holder_type ?? "employee") as HolderType);
      setDepartment(holder?.department ?? "");
      setEmail(holder?.email ?? "");
      setPhone(holder?.phone ?? "");
      setRef(holder?.external_reference ?? "");
      setNotes(holder?.notes ?? "");
    }
  }, [open, holder]);

  const submit = async () => {
    if (!name.trim()) { toast.error("Name is required"); return; }
    if (!orgId && !holder) { toast.error("Organisation not loaded yet"); return; }
    setBusy(true);
    const payload: any = {
      name: name.trim(), holder_type: type,
      department: department || null, email: email || null,
      phone: phone || null, external_reference: ref || null, notes: notes || null,
    };
    let error;
    if (holder) {
      ({ error } = await supabase.from("key_holders").update(payload).eq("id", holder.id));
    } else {
      payload.org_id = orgId;
      payload.created_by = userId;
      ({ error } = await supabase.from("key_holders").insert(payload));
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (!holder) logAction({ action: "key_holder_created", metadata: { holder_name: name.trim() } });
    toast.success(holder ? "Holder updated" : "Holder created");
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{holder ? "Edit holder" : "New key holder"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as HolderType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {HOLDER_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Department</Label>
              <Input value={department} onChange={(e) => setDepartment(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>External reference</Label>
              <Input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Staff ID, etc." />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={busy} className="bg-amber-500 hover:bg-amber-600 text-white">
            {holder ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
