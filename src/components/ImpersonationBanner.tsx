import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

export function ImpersonationBanner() {
  const [info, setInfo] = useState<{ name: string; log_id: string } | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("loxx_impersonation");
    if (raw) setInfo(JSON.parse(raw));
  }, []);

  if (!info) return null;

  const exit = async () => {
    await supabase.functions.invoke("admin-user-action", {
      body: { action: "end_impersonation", log_id: info.log_id },
    });
    const rawAdmin = sessionStorage.getItem("loxx_admin_session");
    sessionStorage.removeItem("loxx_impersonation");
    sessionStorage.removeItem("loxx_admin_session");
    if (rawAdmin) {
      const { access_token, refresh_token } = JSON.parse(rawAdmin);
      await supabase.auth.setSession({ access_token, refresh_token });
    }
    window.location.href = "/admin/users";
  };

  return (
    <div className="w-full bg-amber-100 border-b border-amber-300 px-4 py-2 flex items-center justify-between gap-4">
      <p className="text-sm text-amber-900">
        Viewing as <span className="font-semibold">{info.name}</span> — actions taken here happen in their account.
      </p>
      <Button size="sm" variant="outline" onClick={exit} className="shrink-0">
        <LogOut className="h-4 w-4 mr-2" /> Exit impersonation
      </Button>
    </div>
  );
}
