import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

interface PendingOrg {
  id: string;
  name: string;
  created_at: string;
  member_email: string | null;
  member_name: string | null;
}

export default function AdminApprovals() {
  const [orgs, setOrgs] = useState<PendingOrg[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data: pending } = await supabase
      .from("organisations")
      .select("id, name, created_at")
      .eq("is_approved", false)
      .order("created_at", { ascending: false });
    const list = (pending ?? []) as any[];
    const orgIds = list.map((o) => o.id);
    let memberMap: Record<string, { email: string; name: string }> = {};
    if (orgIds.length) {
      const { data: members } = await supabase
        .from("org_members")
        .select("org_id, email, first_name, last_name")
        .in("org_id", orgIds)
        .eq("org_role", "master_admin");
      (members ?? []).forEach((m: any) => {
        memberMap[m.org_id] = { email: m.email, name: `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() };
      });
    }
    setOrgs(list.map((o) => ({
      ...o,
      member_email: memberMap[o.id]?.email ?? null,
      member_name: memberMap[o.id]?.name ?? null,
    })));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const approve = async (id: string) => {
    await supabase.from("organisations").update({ is_approved: true }).eq("id", id);
    toast.success("Account approved");
    load();
  };

  const reject = async (id: string) => {
    if (!confirm("Reject this account? It will remain unapproved.")) return;
    toast.info("Account left unapproved");
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-6xl">
        <h1 className="text-3xl font-semibold tracking-tight">Pending approvals</h1>
        <p className="text-muted-foreground text-sm mt-1">Organic signups awaiting manual approval before they can access LOXX.</p>

        <div className="rounded-[10px] border bg-card mt-6 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organisation</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Signed up</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
              )}
              {!loading && orgs.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No pending approvals.</TableCell></TableRow>
              )}
              {orgs.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium">{o.name}</TableCell>
                  <TableCell>{o.member_name || "—"}</TableCell>
                  <TableCell>{o.member_email || "—"}</TableCell>
                  <TableCell>{new Date(o.created_at).toLocaleDateString("en-GB")}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" onClick={() => approve(o.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                      <Check className="h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="ghost" className="ml-2" onClick={() => reject(o.id)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
