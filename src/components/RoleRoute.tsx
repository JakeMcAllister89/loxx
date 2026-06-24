import { Navigate } from "react-router-dom";
import { useAuth, OrgRole } from "@/lib/auth";

/** Gate a route by org role. If user lacks any allowed role, redirect to /dashboard. */
export function RoleRoute({ allow, children }: { allow: OrgRole[]; children: React.ReactNode }) {
  const { user, loading, orgRole, orgRoleLoading } = useAuth();
  if (loading || orgRoleLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!orgRole || !allow.includes(orgRole)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
