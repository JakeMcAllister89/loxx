import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function useOrgApproval() {
  const { user, loading: authLoading } = useAuth();
  const [isApproved, setIsApproved] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (authLoading) return;
    if (!user) {
      setIsApproved(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("org_id")
        .eq("id", user.id)
        .maybeSingle();
      const orgId = (prof as any)?.org_id;
      if (!orgId) {
        if (!cancelled) { setIsApproved(true); setLoading(false); }
        return;
      }
      const { data: org } = await supabase
        .from("organisations")
        .select("is_approved")
        .eq("id", orgId)
        .maybeSingle();
      if (!cancelled) {
        setIsApproved(!!(org as any)?.is_approved);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  return { isApproved, loading };
}
