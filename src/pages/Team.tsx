import { useEffect, useMemo, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, OrgRole } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Mail, MoreHorizontal, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { logAction } from "@/lib/audit";

interface Member {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  org_role: OrgRole;
  status: string;
  created_at: string;
}

interface Invite {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  org_role: "admin" | "standard" | "view_only";
  expires_at: string;
  invited_by: string;
  token: string;
  system_ids: string[] | null;
}

interface KSys { id: string; name: string }

const roleLabel: Record<string, string> = {
  master_admin: "Master Admin",
  admin: "Admin",
  standard: "Standard User",
  view_only: "View Only",
};

const ROLE_DESCRIPTIONS: Record<string, string> = {
  admin: "Full access to all systems, orders, and billing. Can manage team members and invite others.",
  standard: "Can create and edit master key systems, place orders, and view order history. Cannot manage team members or billing.",
  view_only: "Can view selected systems only, with no ability to edit, order, or manage anything. You'll be asked to choose which systems they can see.",
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

export default function Team() {
  const { user, orgId, orgRole, refreshOrg } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [systems, setSystems] = useState<KSys[]>([]);
  const [grants, setGrants] = useState<{ system_id: string; user_id: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inv, setInv] = useState({ first_name: "", last_name: "", email: "", org_role: "standard" as Invite["org_role"], system_ids: [] as string[] });
  const [sending, setSending] = useState(false);

  const [removeOf, setRemoveOf] = useState<Member | null>(null);
  const [roleChangeOf, setRoleChangeOf] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<OrgRole>("standard");

  const [accessOf, setAccessOf] = useState<Member | null>(null);
  const [accessSelected, setAccessSelected] = useState<Set<string>>(new Set());

  const isMaster = orgRole === "master_admin";

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    const [m, i, s, g] = await Promise.all([
      supabase.from("org_members").select("*").eq("org_id", orgId).neq("status", "removed").order("created_at"),
      supabase.from("org_invites").select("*").eq("org_id", orgId).is("accepted_at", null).order("created_at", { ascending: false }),
      supabase.from("key_systems").select("id,name").order("name"),
      supabase.from("system_access").select("system_id,user_id"),
    ]);
    setMembers((m.data as any) ?? []);
    setInvites((i.data as any) ?? []);
    setSystems((s.data as any) ?? []);
    setGrants((g.data as any) ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [orgId]);

  const masterCount = useMemo(() => members.filter(m => m.org_role === "master_admin" && m.status === "active").length, [members]);
  const sysName = (id: string) => systems.find(s => s.id === id)?.name ?? "—";

  const userGrants = (uid: string | null) => grants.filter(g => g.user_id === uid).map(g => g.system_id);

  const sendInvite = async () => {
    if (!orgId) return;
    if (!inv.first_name.trim() || !inv.last_name.trim() || !inv.email.trim()) { toast.error("All fields required"); return; }
    if (inv.org_role === "view_only" && inv.system_ids.length === 0) { toast.error("Select at least one system for View Only users"); return; }
    setSending(true);
    const { data, error } = await supabase
      .from("org_invites")
      .insert({
        org_id: orgId,
        invited_by: user!.id,
        first_name: inv.first_name.trim(),
        last_name: inv.last_name.trim(),
        email: inv.email.trim().toLowerCase(),
        org_role: inv.org_role,
        system_ids: inv.system_ids,
      } as any)
      .select("*")
      .single();
    if (error || !data) { setSending(false); toast.error(error?.message ?? "Could not create invite"); return; }
    // Fire email (best-effort)
    await supabase.functions.invoke("send-invite-email", { body: { invite_id: (data as any).id } }).catch(() => {});
    logAction({
      action: "member_invited",
      new_value: inv.email,
      metadata: { target_name: `${inv.first_name} ${inv.last_name}`, target_role: inv.org_role },
    });
    setSending(false);
    setInviteOpen(false);
    setInv({ first_name: "", last_name: "", email: "", org_role: "standard", system_ids: [] });
    toast.success("Invitation sent");
    load();
  };

  const resendInvite = async (i: Invite) => {
    const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("org_invites").update({ expires_at: newExpiry } as any).eq("id", i.id);
    await supabase.functions.invoke("send-invite-email", { body: { invite_id: i.id } }).catch(() => {});
    toast.success("Invitation resent");
    load();
  };

  const cancelInvite = async (i: Invite) => {
    await supabase.from("org_invites").delete().eq("id", i.id);
    toast.success("Invitation cancelled");
    load();
  };

  const doRemove = async () => {
    if (!removeOf) return;
    const { error } = await supabase.functions.invoke("remove-org-member", { body: { member_id: removeOf.id } });
    if (error) { toast.error("Failed to remove member"); return; }
    logAction({
      action: "member_removed",
      metadata: { target_name: `${removeOf.first_name} ${removeOf.last_name}`, target_user_id: removeOf.user_id },
    });
    toast.success("Member removed");
    setRemoveOf(null);
    load();
  };

  const doRoleChange = async () => {
    if (!roleChangeOf) return;
    if (roleChangeOf.org_role === "master_admin" && newRole !== "master_admin" && masterCount <= 1) {
      toast.error("You must assign another Master Admin before changing this role.");
      return;
    }
    const { error } = await supabase.from("org_members").update({ org_role: newRole } as any).eq("id", roleChangeOf.id);
    if (error) { toast.error(error.message); return; }
    logAction({
      action: "member_role_changed",
      old_value: roleChangeOf.org_role,
      new_value: newRole,
      metadata: { target_name: `${roleChangeOf.first_name} ${roleChangeOf.last_name}` },
    });
    toast.success("Role updated");
    setRoleChangeOf(null);
    load();
  };

  const openAccess = (m: Member) => {
    setAccessOf(m);
    setAccessSelected(new Set(userGrants(m.user_id)));
  };

  const saveAccess = async () => {
    if (!accessOf || !accessOf.user_id) return;
    const current = new Set(userGrants(accessOf.user_id));
    const toAdd = [...accessSelected].filter(s => !current.has(s));
    const toRemove = [...current].filter(s => !accessSelected.has(s));
    if (toAdd.length) {
      await supabase.from("system_access").insert(toAdd.map(sid => ({ system_id: sid, user_id: accessOf.user_id!, granted_by: user!.id })) as any);
    }
    if (toRemove.length) {
      await supabase.from("system_access").delete().eq("user_id", accessOf.user_id).in("system_id", toRemove);
    }
    toast.success("Access updated");
    setAccessOf(null);
    load();
  };

  return (
    <DashboardLayout>
      <div className="p-8 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Team</h1>
            <p className="text-muted-foreground text-sm mt-1">Manage who has access to your organisation.</p>
          </div>
          {isMaster && (
            <Button onClick={() => setInviteOpen(true)} className="bg-[#d4820a] hover:bg-[#b86d08] text-white">
              <Plus className="h-4 w-4" /> Invite user
            </Button>
          )}
        </div>

        <div className="bg-card border rounded-[10px] overflow-hidden">
          <div className="px-5 py-3 border-b text-sm font-medium">Active members</div>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5">Name</th>
                  <th className="px-5 py-2.5">Email</th>
                  <th className="px-5 py-2.5">Role</th>
                  <th className="px-5 py-2.5">Systems access</th>
                  <th className="px-5 py-2.5">Joined</th>
                  <th className="px-5 py-2.5 w-12"></th>
                </tr>
              </thead>
              <tbody>
                {members.map(m => {
                  const isSelf = m.user_id === user?.id;
                  const ug = userGrants(m.user_id);
                  const isLastMaster = m.org_role === "master_admin" && masterCount <= 1;
                  return (
                    <tr key={m.id} className="border-t">
                      <td className="px-5 py-3 font-medium">{m.first_name} {m.last_name}{isSelf && <span className="ml-2 text-[11px] text-muted-foreground">(you)</span>}</td>
                      <td className="px-5 py-3 text-muted-foreground">{m.email}</td>
                      <td className="px-5 py-3"><RoleBadge role={m.org_role} /></td>
                      <td className="px-5 py-3">
                        {m.org_role === "view_only" ? (
                          <div className="flex items-center gap-2">
                            <span className={ug.length === 0 ? "text-muted-foreground italic" : ""}>
                              {ug.length === 0 ? "No systems" : ug.map(sysName).join(", ")}
                            </span>
                            {isMaster && m.user_id && (
                              <button onClick={() => openAccess(m)} className="text-xs text-[#d4820a] hover:underline">Edit access</button>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">All systems</span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-muted-foreground">{new Date(m.created_at).toLocaleDateString("en-GB")}</td>
                      <td className="px-5 py-3 text-right">
                        {isMaster && !isSelf && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button size="sm" variant="ghost"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setRoleChangeOf(m); setNewRole(m.org_role); }}>Change role</DropdownMenuItem>
                              {!isLastMaster && (
                                <DropdownMenuItem className="text-destructive" onClick={() => setRemoveOf(m)}>Remove from org</DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {invites.length > 0 && (
          <div className="bg-card border rounded-[10px] overflow-hidden mt-6">
            <div className="px-5 py-3 border-b text-sm font-medium">Pending invitations</div>
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-5 py-2.5">Name</th>
                  <th className="px-5 py-2.5">Email</th>
                  <th className="px-5 py-2.5">Role</th>
                  <th className="px-5 py-2.5">Expires</th>
                  <th className="px-5 py-2.5 w-40">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map(i => (
                  <tr key={i.id} className="border-t">
                    <td className="px-5 py-3">{i.first_name} {i.last_name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{i.email}</td>
                    <td className="px-5 py-3"><RoleBadge role={i.org_role} /></td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(i.expires_at).toLocaleDateString("en-GB")}</td>
                    <td className="px-5 py-3">
                      {isMaster && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => resendInvite(i)}><RefreshCw className="h-3.5 w-3.5" /> Resend</Button>
                          <Button size="sm" variant="ghost" className="text-destructive" onClick={() => cancelInvite(i)}><X className="h-3.5 w-3.5" /> Cancel</Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invite Drawer */}
      <Drawer open={inviteOpen} onOpenChange={setInviteOpen}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-lg">
            <DrawerHeader><DrawerTitle>Invite a user</DrawerTitle></DrawerHeader>
            <div className="px-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>First name</Label><Input value={inv.first_name} onChange={e => setInv({ ...inv, first_name: e.target.value })} /></div>
                <div><Label>Last name</Label><Input value={inv.last_name} onChange={e => setInv({ ...inv, last_name: e.target.value })} /></div>
              </div>
              <div><Label>Email</Label><Input type="email" value={inv.email} onChange={e => setInv({ ...inv, email: e.target.value })} /></div>
              <div>
                <Label>Role</Label>
                <Select value={inv.org_role} onValueChange={(v: any) => setInv({ ...inv, org_role: v, system_ids: [] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div><div className="font-medium">Admin</div><div className="text-xs text-muted-foreground">Full access, can manage team</div></div>
                    </SelectItem>
                    <SelectItem value="standard">
                      <div><div className="font-medium">Standard User</div><div className="text-xs text-muted-foreground">Build systems and place orders</div></div>
                    </SelectItem>
                    <SelectItem value="view_only">
                      <div><div className="font-medium">View Only</div><div className="text-xs text-muted-foreground">Read-only access to selected systems</div></div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-2 bg-muted rounded-md px-3 py-2">
                  {ROLE_DESCRIPTIONS[inv.org_role]}
                </p>
              </div>
              {(inv.org_role === "view_only" || inv.org_role === "standard") && (
                <div>
                  <Label>
                    {inv.org_role === "view_only" ? "Select systems this user can access" : "Restrict to specific systems (optional)"}
                  </Label>
                  <div className="border rounded-md max-h-48 overflow-auto p-2 space-y-1.5 mt-1">
                    {systems.length === 0 && <div className="text-xs text-muted-foreground p-2">No systems exist yet</div>}
                    {systems.map(s => (
                      <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <Checkbox
                          checked={inv.system_ids.includes(s.id)}
                          onCheckedChange={(c) => {
                            const set = new Set(inv.system_ids);
                            if (c) set.add(s.id); else set.delete(s.id);
                            setInv({ ...inv, system_ids: [...set] });
                          }}
                        />
                        <span>{s.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DrawerFooter>
              <Button onClick={sendInvite} disabled={sending} className="bg-[#d4820a] hover:bg-[#b86d08] text-white">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} Send invitation
              </Button>
              <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* System access drawer */}
      <Drawer open={!!accessOf} onOpenChange={(o) => !o && setAccessOf(null)}>
        <DrawerContent>
          <div className="mx-auto w-full max-w-lg">
            <DrawerHeader><DrawerTitle>Edit systems access — {accessOf?.first_name} {accessOf?.last_name}</DrawerTitle></DrawerHeader>
            <div className="px-4">
              <div className="border rounded-md max-h-72 overflow-auto p-2 space-y-1.5">
                {systems.map(s => (
                  <label key={s.id} className="flex items-center gap-2 text-sm cursor-pointer">
                    <Checkbox
                      checked={accessSelected.has(s.id)}
                      onCheckedChange={(c) => {
                        const set = new Set(accessSelected);
                        if (c) set.add(s.id); else set.delete(s.id);
                        setAccessSelected(set);
                      }}
                    />
                    <span>{s.name}</span>
                  </label>
                ))}
              </div>
            </div>
            <DrawerFooter>
              <Button onClick={saveAccess} className="bg-[#d4820a] hover:bg-[#b86d08] text-white">Save access</Button>
              <Button variant="outline" onClick={() => setAccessOf(null)}>Cancel</Button>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Role change dialog */}
      <AlertDialog open={!!roleChangeOf} onOpenChange={(o) => !o && setRoleChangeOf(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change role — {roleChangeOf?.first_name} {roleChangeOf?.last_name}</AlertDialogTitle>
            <AlertDialogDescription>
              <Select value={newRole} onValueChange={(v: any) => setNewRole(v)}>
                <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="master_admin">Master Admin</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="standard">Standard User</SelectItem>
                  <SelectItem value="view_only">View Only</SelectItem>
                </SelectContent>
              </Select>
              {newRole === "master_admin" && (
                <div className="mt-3 p-2 rounded bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                  This user will have full control of the organisation including the ability to remove other users.
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doRoleChange}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Remove confirm */}
      <AlertDialog open={!!removeOf} onOpenChange={(o) => !o && setRemoveOf(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeOf?.first_name} {removeOf?.last_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              They will immediately lose all access. This action is logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={doRemove} className="bg-destructive hover:bg-destructive/90 text-white">
              <Trash2 className="h-4 w-4" /> Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
