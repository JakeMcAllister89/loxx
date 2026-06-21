import { Navigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth, useIsAdmin } from "@/lib/auth";
import { toast } from "sonner";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isAdminLoading } = useAuth();
  const isAdmin = useIsAdmin();
  useEffect(() => {
    if (!loading && !isAdminLoading && user && !isAdmin) toast.error("Access denied");
  }, [loading, isAdminLoading, user, isAdmin]);
  if (loading || isAdminLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}
