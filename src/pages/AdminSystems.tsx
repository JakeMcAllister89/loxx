import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ExternalLink, Search, ArrowRightLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SystemRow {
  id: string;
  name: string;
  reference: string;
  door_count: number;
  org_id: string | null;
  org_name: string;
  created_at: string;
  updated_at: string;
  is_fulfilled: boolean;
}

interface Org { id: string; name: string; }

export default function AdminSystems() {
  const [systems, setSystems] = useState<SystemRow[]>([]);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [assignTarget, setAssignTarget] = useState<SystemRow | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: sys }, { data: orgRows }] = await Promise.all([
      supabase.from("key_systems").select("id,name,reference,door_count,org_id,created_at,updated_at,is_fulfilled").order("updated_at", { ascending: false }),
      supabase.from("organisations").select("id,name").order("name"),
    ]);
    const orgMap = new Map((orgRows ?? []).map((o: any) => [o.id, o.name]));
    setSystems((sys ?? []).map((s: any) => ({
      ...s,
      org_name: orgMap.get(s.org_id) ?? "—",
    })));
    setOrgs((orgRows ?? []) as Org[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!q) return systems;
    const lq = q.toLowerCase();
    return systems.filter(s =>
      s.name?.toLowerCase().includes(lq) ||
      s.reference?.toLowerCase().includes(lq) ||
      s.org_name?.toLowerCase().includes(lq)
    );
  }, [systems, q]);

  const openAssign = (s: SystemRow) => {
    setAssignTarget(s);
    setSelectedOrgId(s.org_id ?? "");
  };

  const doAssign = async () => {
    if (!assignTarget || !selectedOrgId) return;
    if (selectedOrgId === assignTarget.org_id) {
      toast.info("System is already assigned to this organisation");
      return;
    }
    setAssigning(true);
    const { data, error } = await supabase.functions.invoke("admin-catalogue", {
      body: { action: "assign_system", system_id: assignTarget.id, target_org_id: selectedOrgId },
    });
    setAssigning(false);
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error ?? error?.message ?? "Assignment failed");
      return;
    }
    toast.success(`System assigned to ${orgs.find(o => o.id === selectedOrgId)?.name ?? "organisation"}`);
    setAssignTarget(null);
    setSelectedOrgId("");
    load();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Systems</h1>
          <p className="text-sm text-muted-foreground">All master key systems across every organisation.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, reference or organisation…"
              className="pl-9"
            />
          </div>
          <div className="text-sm text-muted-foreground">
            {filtered.length} system{filtered.length !== 1 ? "s" : ""}
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>System</TableHead>
                <TableHead>Organisation</TableHead>
                <TableHead>Doors</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Updated</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              )}
              {!loading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No systems found.</TableCell></TableRow>
              )}
              {filtered.map(s => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.reference}</div>
                  </TableCell>
                  <TableCell>{s.org_name}</TableCell>
                  <TableCell>{s.door_count ?? 0}</TableCell>
                  <TableCell>
                    {s.is_fulfilled
                      ? <Badge variant="secondary">Hardware ordered</Badge>
                      : <Badge>Active</Badge>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(s.updated_at).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link to={`/builder/${s.id}`}><ExternalLink className="h-3.5 w-3.5 mr-1" /> Open</Link>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAssign(s)}>
                        <ArrowRightLeft className="h-3.5 w-3.5 mr-1" /> Assign
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={!!assignTarget} onOpenChange={(o) => { if (!o) { setAssignTarget(null); setSelectedOrgId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign system to organisation</DialogTitle>
            <DialogDescription>
              This moves <strong>{assignTarget?.name}</strong> ({assignTarget?.reference}) to a different organisation.
              The system will appear in that organisation's dashboard and the ownership will transfer to their master admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Assign to</Label>
              <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an organisation" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}{o.id === assignTarget?.org_id && " (current)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setAssignTarget(null); setSelectedOrgId(""); }}>Cancel</Button>
              <Button onClick={doAssign} disabled={assigning || !selectedOrgId}>
                {assigning ? "Assigning…" : "Confirm assignment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
