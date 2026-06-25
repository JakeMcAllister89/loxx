import { createContext, useContext, useEffect, useRef, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type OrgRole = "master_admin" | "admin" | "standard" | "view_only";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  isAdminLoading: boolean;
  orgRole: OrgRole | null;
  orgId: string | null;
  orgRoleLoading: boolean;
  refreshOrg: () => Promise<void>;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  session: null,
  loading: true,
  isAdmin: false,
  isAdminLoading: true,
  orgRole: null,
  orgId: null,
  orgRoleLoading: true,
  refreshOrg: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAdminLoading, setIsAdminLoading] = useState(true);
  const [orgRole, setOrgRole] = useState<OrgRole | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [orgRoleLoading, setOrgRoleLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      // Skip TOKEN_REFRESHED events — these fire on tab focus and cause
      // unnecessary re-renders that reset in-progress component state
      if (event === "TOKEN_REFRESHED") return;
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const loadOrg = async (uid: string) => {
    setOrgRoleLoading(true);
    const { data } = await supabase
      .from("org_members")
      .select("org_id,org_role")
      .eq("user_id", uid)
      .eq("status", "active")
      .maybeSingle();
    setOrgRole(((data as any)?.org_role as OrgRole) ?? null);
    setOrgId((data as any)?.org_id ?? null);
    setOrgRoleLoading(false);
  };

  const lastLoadedUid = useRef<string | null>(null);
  useEffect(() => {
    // Still loading auth — don't reset isAdminLoading yet
    if (loading) return;
    if (!user) {
      lastLoadedUid.current = null;
      setIsAdmin(false);
      setIsAdminLoading(false);
      setOrgRole(null); setOrgId(null); setOrgRoleLoading(false);
      return;
    }
    // Skip if we already loaded for this user — prevents double-fire from
    // getSession + onAuthStateChange both setting the same user
    if (lastLoadedUid.current === user.id) return;
    lastLoadedUid.current = user.id;
    setIsAdminLoading(true);
    supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle()
      .then(({ data }) => { setIsAdmin(!!(data as any)?.is_admin); setIsAdminLoading(false); });
    loadOrg(user.id);
  }, [user, loading]);

  const refreshOrg = async () => { if (user) await loadOrg(user.id); };

  return (
    <Ctx.Provider value={{ user, session, loading, isAdmin, isAdminLoading, orgRole, orgId, orgRoleLoading, refreshOrg, signOut: async () => { await supabase.auth.signOut(); } }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
export const useIsAdmin = () => useContext(Ctx).isAdmin;
export const useOrgRole = () => useContext(Ctx).orgRole;

/** Whether the current org role can perform an action. */
export function canRole(role: OrgRole | null, action:
  | "delete_system" | "place_order" | "view_quotes" | "view_orders"
  | "see_prices" | "edit_system" | "view_audit" | "manage_team" | "create_system"): boolean {
  if (!role) return false;
  switch (action) {
    case "delete_system":
    case "manage_team":
      return role === "master_admin";
    case "place_order":
      return role === "master_admin" || role === "admin";
    case "view_quotes":
    case "view_orders":
    case "see_prices":
    case "edit_system":
    case "view_audit":
    case "create_system":
      return role !== "view_only";
  }
}
