import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { MoreHorizontal, Search, Mail, UserX, ChevronDown, ChevronRight, RefreshCw, X, ArrowLeftRight, Ban, UserCog } from "lucide-react";

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  name: string | null;
  email: string | null;
  created_at: string;
  org_id: string | null;
  is_admin?: boolean | null;
}
interface MemberRow {
  user_id: string;
  org_id: string;
  org_role: string;
  status: string;
}
interface OrgRow { id: string; name: string }
interface UserStat { id: string; last_sign_in_at: string | null; email_confirmed_at: string | null }

interface PlatformInvite {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  company: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  token: string;
}

const roleLabel: Record<string, string> = {
  master_admin: "Master Admin",
  admin: "Admin",
  standard: "Standard User",
  view_only: "View Only",
};

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    master_admin: "bg-[#17171a] text-white",
    admin: "bg-[#d4820a] text-white",
    standard: "bg-blue-600 text-white",
    view_only: "bg-gray-300 text-gray-800",
  };
  return <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${styles[role] ?? "bg-gray-200"}`}>{roleLabel[role] ?? role}</span>;
}

function StatusBadge({ last, confirmed }: { last: string | null; confirmed: string | null }) {
  if (!last) {
    return <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">Pending</span>;
  }
  const days = (Date.now() - new Date(last).getTime()) / 86400000;
  if (days <= 90) return <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-green-100 text-green-800">Active</span>;
  return <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-700">Inactive</span>;
}

const fmtDate = (s: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

export default function AdminUsers() {
  const { user: me } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [orgs, setOrgs] = useState<OrgRow[]>([]);
  const [stats, setStats] = useState<Record<string, UserStat>>({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const [removeOf, setRemoveOf] = useState<{ id: string; name: string } | null>(null);
  const [suspendOf, setSuspendOf] = useState<{ id: string; name: string } | null>(null);
  const [transferState, setTransferState] = useState<{
    fromUserId: string;
    fromName: string;
    orgId: string;
    orgName: string;
  } | null>(null);
  const [transferToId, setTransferToId] = useState<string>("");
  const [transferReason, setTransferReason] = useState<string>("");
  const [transferring, setTransferring] = useState(false);

  // Invitations
  const [invites, setInvites] = useState<PlatformInvite[]>([]);
  const [inv, setInv] = useState({ first_name: "", last_name: "", email: "", company: "" });
  const [sendingInv, setSendingInv] = useState(false);
  const [showAccepted, setShowAccepted] = useState(false);

  const loadAll = async () => {
    setLoading(true);
    const [p, m, o, i] = await Promise.all([
      supabase.from("profiles").select("id,first_name,last_name,name,email,phone,default_address,default_invoice_address,created_at,org_id,is_admin").order("created_at", { ascending: false }),
      supabase.from("org_members").select("user_id,org_id,org_role,status"),
      supabase.from("organisations").select("id,name"),
      supabase.from("platform_invites").select("*").order("created_at", { ascending: false }),
    ]);
    setProfiles(((p.data as any) ?? []) as ProfileRow[]);
    setMembers(((m.data as any) ?? []) as MemberRow[]);
    setOrgs(((o.data as any) ?? []) as OrgRow[]);
    setInvites(((i.data as any) ?? []) as PlatformInvite[]);

    try {
      const { data } = await supabase.functions.invoke("admin-user-stats", { body: {} });
      const map: Record<string, UserStat> = {};
      ((data as any)?.users ?? []).forEach((u: UserStat) => { map[u.id] = u; });
      setStats(map);
    } catch (e) {
      console.warn("admin-user-stats failed", e);
    }
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  const orgName = (id: string | null) => orgs.find(o => o.id === id)?.name ?? "—";
  const memberFor = (uid: string) => members.find(m => m.user_id === uid && m.status === "active");

  const enriched = useMemo(() => profiles.map(p => {
    const mem = memberFor(p.id);
    return {
      ...p,
      org_role: mem?.org_role ?? "—",
      org_name: orgName(p.org_id ?? mem?.org_id ?? null),
      last_sign_in_at: stats[p.id]?.last_sign_in_at ?? null,
      email_confirmed_at: stats[p.id]?.email_confirmed_at ?? null,
    };
  }), [profiles, members, orgs, stats]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return enriched.filter(u => {
      if (roleFilter !== "all" && u.org_role !== roleFilter) return false;
      if (!q) return true;
      const full = `${u.first_name ?? ""} ${u.last_name ?? ""} ${u.name ?? ""}`.toLowerCase();
      return full.includes(q) || (u.email ?? "").toLowerCase().includes(q) || u.org_name.toLowerCase().includes(q);
    });
  }, [enriched, search, roleFilter]);

  const summary = useMemo(() => {
    const total = enriched.length;
    const active = enriched.filter(u => u.last_sign_in_at && (Date.now() - new Date(u.last_sign_in_at).getTime()) / 86400000 <= 90).length;
    const orgCount = new Set(enriched.map(u => u.org_id).filter(Boolean)).size;
    const never = enriched.filter(u => !u.last_sign_in_at).length;
    return { total, active, orgCount, never };
  }, [enriched]);

  const sendReset = async (email: string) => {
    const { data, error } = await supabase.functions.invoke("admin-user-action", { body: { action: "reset_password", email } });
    if (error || !(data as any)?.ok) { toast.error((data as any)?.error ?? "Failed to send"); return; }
    toast.success("Password reset email sent");
  };

  const impersonate = async (targetId: string, targetName: string) => {
    const { data: { session: adminSession } } = await supabase.auth.getSession();
    if (!adminSession) return;
    const { data, error } = await supabase.functions.invoke("admin-user-action", {
      body: { action: "impersonate", user_id: targetId },
    });
    if (error || (data as any)?.error) {
      toast.error((data as any)?.error || error?.message || "Could not start impersonation");
      return;
    }
    const { token_hash, email, log_id } = data as any;
    sessionStorage.setItem("loxx_admin_session", JSON.stringify({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token,
    }));
    sessionStorage.setItem("loxx_impersonation", JSON.stringify({ name: targetName, log_id }));
    const { error: otpError } = await supabase.auth.verifyOtp({ email, token_hash, type: "magiclink" });
    if (otpError) {
      toast.error("Could not switch session: " + otpError.message);
      sessionStorage.removeItem("loxx_admin_session");
      sessionStorage.removeItem("loxx_impersonation");
      return;
    }
    window.location.href = "/dashboard";
  };

  const doRemove = async () => {
    if (!removeOf) return;
    const { data, error } = await supabase.functions.invoke("admin-user-action", { body: { action: "disable", user_id: removeOf.id } });
    if (error || !(data as any)?.ok) { toast.error((data as any)?.error ?? "Failed to remove account"); return; }
    toast.success("Account removed");
    setRemoveOf(null);
    loadAll();
  };

  const doSuspend = async () => {
    if (!suspendOf) return;
    const { data, error } = await supabase.functions.invoke("admin-user-action", {
      body: { action: "suspend_user", user_id: suspendOf.id },
    });
    if (error || !(data as any)?.ok) { toast.error((data as any)?.error ?? "Failed to suspend"); return; }
    toast.success(`${suspendOf.name} suspended`);
    setSuspendOf(null);
    loadAll();
  };

  const doTransfer = async () => {
    if (!transferState || !transferToId) return;
    setTransferring(true);
    const { data, error } = await supabase.functions.invoke("admin-user-action", {
      body: {
        action: "transfer_master_admin",
        org_id: transferState.orgId,
        from_user_id: transferState.fromUserId,
        to_user_id: transferToId,
        reason: transferReason.trim() || undefined,
      },
    });
    setTransferring(false);
    if (error || !(data as any)?.ok) { toast.error((data as any)?.error ?? "Transfer failed"); return; }
    toast.success("Master Admin transferred");
    setTransferState(null);
    setTransferToId("");
    setTransferReason("");
    loadAll();
  };


  const sendInvitation = async () => {
    if (!inv.first_name.trim() || !inv.last_name.trim() || !inv.email.trim() || !inv.company.trim()) {
      toast.error("All fields are required"); return;
    }
    setSendingInv(true);
    const { data, error } = await supabase.from("platform_invites").insert({
      invited_by: me!.id,
      first_name: inv.first_name.trim(),
      last_name: inv.last_name.trim(),
      email: inv.email.trim().toLowerCase(),
      company: inv.company.trim(),
    } as any).select("*").single();
    if (error || !data) { setSendingInv(false); toast.error(error?.message ?? "Could not create invite"); return; }
    await supabase.functions.invoke("send-platform-invite", { body: { invite_id: (data as any).id } }).catch(() => {});
    setSendingInv(false);
    setInv({ first_name: "", last_name: "", email: "", company: "" });
    toast.success(`Invitation sent to ${(data as any).email}`);
    loadAll();
  };

  const resendInvite = async (i: PlatformInvite) => {
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("platform_invites").update({ expires_at: newExpiry } as any).eq("id", i.id);
    await supabase.functions.invoke("send-platform-invite", { body: { invite_id: i.id } }).catch(() => {});
    toast.success("Invitation resent");
    loadAll();
  };

  const cancelInvite = async (i: PlatformInvite) => {
    await supabase.from("platform_invites").delete().eq("id", i.id);
    toast.success("Invitation cancelled");
    loadAll();
  };

  const pending = invites.filter(i => !i.accepted_at);
  const accepted = invites.filter(i => i.accepted_at);

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">Manage all platform users and customer invitations.</p>
        </div>

        <Tabs defaultValue="users">
          <TabsList>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="invites">Customer Invitations</TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <SummaryCard label="Total users" value={summary.total} />
              <SummaryCard label="Active (90 days)" value={summary.active} />
              <SummaryCard label="Organisations" value={summary.orgCount} />
              <SummaryCard label="Never signed in" value={summary.never} />
            </div>

            <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name, email or organisation" className="pl-9" />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full md:w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All roles</SelectItem>
                  <SelectItem value="master_admin">Master Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="standard">Standard User</SelectItem>
                  <SelectItem value="view_only">View Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Organisation</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Registered</TableHead>
                    <TableHead>Last sign in</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">Loading…</TableCell></TableRow>
                  )}
                  {!loading && filtered.length === 0 && (
                    <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No users found.</TableCell></TableRow>
                  )}
                  {filtered.map(u => {
                    const isSelf = u.id === me?.id;
                    const fullName = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.name || "—";
                    const last = u.last_sign_in_at ? fmtDate(u.last_sign_in_at) : null;
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{fullName}{isSelf && <span className="ml-2 text-[11px] text-muted-foreground">(you)</span>}</TableCell>
                        <TableCell className="text-muted-foreground">{u.email}</TableCell>
                        <TableCell className="text-muted-foreground">{(u as any).phone || "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-[200px]">
                          {(() => {
                            const addr = (u as any).default_address;
                            if (!addr || !addr.line1) return "—";
                            return [addr.line1, addr.city, addr.postcode].filter(Boolean).join(", ");
                          })()}
                        </TableCell>
                        <TableCell>{u.org_name}</TableCell>
                        <TableCell>{u.org_role !== "—" ? <RoleBadge role={u.org_role} /> : <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(u.created_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{last ?? <span className="text-muted-foreground italic">Never</span>}</TableCell>
                        <TableCell><StatusBadge last={u.last_sign_in_at} confirmed={u.email_confirmed_at} /></TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => u.email && sendReset(u.email)}>
                                <Mail className="h-4 w-4 mr-2" /> Send password reset
                              </DropdownMenuItem>
                              {!isSelf && !(u as any).is_admin && (
                                <DropdownMenuItem onClick={() => impersonate(u.id, fullName)}>
                                  <UserCog className="h-4 w-4 mr-2" /> Impersonate
                                </DropdownMenuItem>
                              )}
                              {!isSelf && u.org_role === "master_admin" && (
                                <DropdownMenuItem
                                  onClick={() => setTransferState({
                                    fromUserId: u.id,
                                    fromName: fullName,
                                    orgId: u.org_id ?? memberFor(u.id)?.org_id ?? "",
                                    orgName: u.org_name,
                                  })}
                                >
                                  <ArrowLeftRight className="h-4 w-4 mr-2" /> Transfer Master Admin
                                </DropdownMenuItem>
                              )}
                              {!isSelf && (
                                <DropdownMenuItem
                                  className="text-amber-700"
                                  onClick={() => setSuspendOf({ id: u.id, name: fullName })}
                                >
                                  <Ban className="h-4 w-4 mr-2" /> Suspend user
                                </DropdownMenuItem>
                              )}
                              {!isSelf && (
                                <DropdownMenuItem className="text-destructive" onClick={() => setRemoveOf({ id: u.id, name: fullName })}>
                                  <UserX className="h-4 w-4 mr-2" /> Remove account
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </TabsContent>

          <TabsContent value="invites" className="mt-4 space-y-6">
            <div className="rounded-[10px] border bg-card shadow-card p-5">
              <h2 className="text-sm font-semibold mb-3">Invite a new customer</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div><Label>First name</Label><Input value={inv.first_name} onChange={e => setInv({ ...inv, first_name: e.target.value })} /></div>
                <div><Label>Last name</Label><Input value={inv.last_name} onChange={e => setInv({ ...inv, last_name: e.target.value })} /></div>
                <div><Label>Email</Label><Input type="email" value={inv.email} onChange={e => setInv({ ...inv, email: e.target.value })} /></div>
                <div><Label>Company</Label><Input value={inv.company} onChange={e => setInv({ ...inv, company: e.target.value })} /></div>
              </div>
              <div className="mt-4">
                <Button onClick={sendInvitation} disabled={sendingInv} className="bg-[#d4820a] hover:bg-[#b86d08] text-white">
                  {sendingInv ? "Sending…" : "Send invitation"}
                </Button>
              </div>
            </div>

            <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
              <div className="px-5 py-3 border-b text-sm font-medium">Pending invitations ({pending.length})</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-40"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No pending invitations.</TableCell></TableRow>
                  )}
                  {pending.map(i => {
                    const expired = new Date(i.expires_at) < new Date();
                    return (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.first_name} {i.last_name}</TableCell>
                        <TableCell className="text-muted-foreground">{i.email}</TableCell>
                        <TableCell>{i.company}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(i.created_at)}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(i.expires_at)}</TableCell>
                        <TableCell>
                          {expired
                            ? <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-700">Expired</span>
                            : <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-100 text-amber-800">Pending</span>}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => resendInvite(i)}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Resend</Button>
                            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelInvite(i)}><X className="h-3.5 w-3.5 mr-1" /> Cancel</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-[10px] border bg-card shadow-card overflow-hidden">
              <button onClick={() => setShowAccepted(s => !s)} className="w-full px-5 py-3 border-b text-sm font-medium flex items-center justify-between hover:bg-muted/30">
                <span>Accepted invitations ({accepted.length})</span>
                {showAccepted ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              {showAccepted && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Accepted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {accepted.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">None yet.</TableCell></TableRow>
                    )}
                    {accepted.map(i => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.first_name} {i.last_name}</TableCell>
                        <TableCell className="text-muted-foreground">{i.email}</TableCell>
                        <TableCell>{i.company}</TableCell>
                        <TableCell className="font-mono text-xs">{fmtDate(i.accepted_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={!!removeOf} onOpenChange={(o) => !o && setRemoveOf(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeOf?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate their account. Their system data and order history will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Remove account</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!suspendOf} onOpenChange={(o) => !o && setSuspendOf(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Suspend {suspendOf?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will immediately block their access to LOXX. Their data is preserved. You can remove their account separately if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doSuspend} className="bg-amber-600 hover:bg-amber-700 text-white">
              Suspend account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!transferState} onOpenChange={(o) => { if (!o) { setTransferState(null); setTransferToId(""); setTransferReason(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Master Admin</DialogTitle>
            <DialogDescription>
              Reassign the Master Admin role for <strong>{transferState?.orgName}</strong> from <strong>{transferState?.fromName}</strong> to another active member of that organisation. The current Master Admin will be downgraded to Admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Transfer to</Label>
              <Select value={transferToId} onValueChange={setTransferToId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a member…" />
                </SelectTrigger>
                <SelectContent>
                  {enriched
                    .filter(u =>
                      u.org_id === transferState?.orgId &&
                      u.id !== transferState?.fromUserId &&
                      memberFor(u.id)?.status === "active"
                    )
                    .map(u => {
                      const name = `${u.first_name ?? ""} ${u.last_name ?? ""}`.trim() || u.name || u.email || u.id;
                      return <SelectItem key={u.id} value={u.id}>{name} — {roleLabel[u.org_role] ?? u.org_role}</SelectItem>;
                    })}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Reason (optional)</Label>
              <Input
                placeholder="e.g. User has left the organisation"
                value={transferReason}
                onChange={e => setTransferReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferState(null)}>Cancel</Button>
            <Button
              disabled={!transferToId || transferring}
              onClick={doTransfer}
              className="bg-[#17171a] hover:bg-[#2a2a2e] text-white"
            >
              {transferring ? "Transferring…" : "Transfer Master Admin"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border bg-card shadow-card p-4">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-semibold mt-1 font-mono">{value}</div>
    </div>
  );
}
