import { DashboardLayout } from "@/components/DashboardLayout";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Copy, MoreHorizontal, KeyRound, Loader2, ExternalLink } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { createSystem } from "@/lib/createSystem";

interface Sys { id: string; name: string; reference: string | null; door_count: number; updated_at: string; }

function timeAgo(iso: string) {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return "just now";
  if (d < 3600) return `${Math.floor(d / 60)} min ago`;
  if (d < 86400) return `${Math.floor(d / 3600)} hr ago`;
  const days = Math.floor(d / 86400);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  return new Date(iso).toLocaleDateString("en-GB");
}

export default function Systems() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [systems, setSystems] = useState<Sys[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [renameOf, setRenameOf] = useState<Sys | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [deleteOf, setDeleteOf] = useState<Sys | null>(null);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase.from("key_systems").select("id,name,reference,door_count,updated_at").order("updated_at", { ascending: false });
    setSystems(data ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const onNew = async () => {
    if (!user || creating) return;
    setCreating(true);
    const id = await createSystem(user.id);
    setCreating(false);
    if (id) navigate(`/builder/${id}`);
    else toast.error("Could not create system");
  };

  const duplicate = async (s: Sys) => {
    if (!user) return;
    const { data: src } = await supabase.from("key_systems").select("*").eq("id", s.id).single();
    if (!src) return;
    const { data: prof } = await supabase.from("profiles").select("org_id").eq("id", user.id).maybeSingle();
    const orgId = (prof as any)?.org_id ?? null;
    const ref = `SYS-${Math.floor(1000 + Math.random() * 9000)}`;
    const { data } = await supabase.from("key_systems").insert({
      user_id: user.id, org_id: orgId, name: `Copy of ${src.name}`, reference: ref, tree_data: src.tree_data, door_count: src.door_count,
    } as any).select("id").single();
    if (data) navigate(`/builder/${data.id}`);
  };

  const doRename = async () => {
    if (!renameOf || !renameValue.trim()) return;
    await supabase.from("key_systems").update({ name: renameValue.trim() }).eq("id", renameOf.id);
    setRenameOf(null);
    toast.success("Renamed");
    load();
  };

  const doDelete = async () => {
    if (!deleteOf) return;

    // Block deletion if this system has any linked orders
    const { data: linkedOrders, error: checkError } = await supabase
      .from("orders")
      .select("id")
      .eq("system_id", deleteOf.id)
      .limit(1);

    if (checkError) {
      toast.error("Could not verify order history. Please try again.");
      return;
    }

    if (linkedOrders && linkedOrders.length > 0) {
      setDeleteOf(null);
      toast.error("This system has been ordered and cannot be deleted. Order records must be retained.");
      return;
    }

    await supabase.from("key_systems").delete().eq("id", deleteOf.id);
    setDeleteOf(null);
    toast.success("System deleted");
    load();
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">My Systems</h1>
            <p className="text-muted-foreground text-sm mt-1">All your master key systems.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild><Link to="/import"><Upload className="h-4 w-4" /> Import existing</Link></Button>
            <Button onClick={onNew} disabled={creating} className="bg-amber-500 hover:bg-amber-600 text-white">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} New system
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground p-12 text-center">Loading…</div>
        ) : systems.length === 0 ? (
          <div className="rounded-[10px] border-2 border-dashed bg-card p-16 text-center">
            <KeyRound className="h-12 w-12 mx-auto text-amber-500" />
            <p className="mt-4 text-lg font-medium">No systems yet</p>
            <div className="flex gap-3 justify-center mt-5">
              <Button onClick={onNew} disabled={creating} className="bg-amber-500 hover:bg-amber-600 text-white">Start from scratch</Button>
              <Button asChild variant="outline"><Link to="/import">Import existing</Link></Button>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {systems.map((s) => (
              <div key={s.id} className="rounded-[10px] border bg-card p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.name}</div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {s.reference && <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-200">{s.reference}</span>}
                      <span className="text-xs text-muted-foreground">{s.door_count} doors</span>
                      <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-800">Active</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1.5">Updated {timeAgo(s.updated_at)}</div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button size="sm" asChild className="bg-amber-500 hover:bg-amber-600 text-white"><Link to={`/builder/${s.id}`}>Open <ExternalLink className="h-3.5 w-3.5" /></Link></Button>
                  <Button size="sm" variant="outline" onClick={() => duplicate(s)}><Copy className="h-3.5 w-3.5" /> Duplicate</Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setRenameOf(s); setRenameValue(s.name); }}>Rename</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toast.info("Archive coming soon")}>Archive</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteOf(s)}>Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!renameOf} onOpenChange={(o) => !o && setRenameOf(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rename system</DialogTitle></DialogHeader>
          <Input value={renameValue} onChange={(e) => setRenameValue(e.target.value)} placeholder="System name" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOf(null)}>Cancel</Button>
            <Button onClick={doRename} className="bg-amber-500 hover:bg-amber-600 text-white">Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteOf} onOpenChange={(o) => !o && setDeleteOf(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this system?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteOf?.name}" including all nodes, cylinder assignments, and key specifications. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doDelete} className="bg-destructive hover:bg-destructive/90 text-white">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
