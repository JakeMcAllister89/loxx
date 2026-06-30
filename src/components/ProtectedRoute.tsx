import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { useOrgApproval } from "@/hooks/useOrgApproval";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdmin } = useAuth();
  const { isApproved, loading: approvalLoading } = useOrgApproval();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;

  const exempt = location.pathname === "/pending-approval" || location.pathname === "/account";
  if (!isAdmin && !exempt) {
    if (approvalLoading || isApproved === null) {
      return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
    }
    if (isApproved === false) return <Navigate to="/pending-approval" replace />;
  }
  return <>{children}</>;
}
