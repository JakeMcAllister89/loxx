import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LoxxLogo } from "@/components/LoxxLogo";

// Beta namespace not in generated types yet.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><LoxxLogo size="lg" /></div>
        <div className="bg-card rounded-[10px] border shadow-card p-8">
          {error ? (
            <>
              <h1 className="text-xl font-semibold mb-2">Couldn't load this request</h1>
              <p className="text-sm text-muted-foreground">{error}</p>
            </>
          ) : !details ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight">
                Connect {details.client?.name ?? "an app"} to My LOXX
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {details.client?.name ?? "This app"} is requesting access to act on your behalf in My LOXX.
                It will be able to read your organisation's data through the tools you use it with.
              </p>
              <div className="mt-6 flex gap-3">
                <Button disabled={busy} onClick={() => decide(true)} className="flex-1">Approve</Button>
                <Button disabled={busy} variant="outline" onClick={() => decide(false)} className="flex-1">Deny</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
