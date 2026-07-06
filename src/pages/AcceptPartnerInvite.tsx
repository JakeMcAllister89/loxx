import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoxxLogo } from "@/components/LoxxLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InviteInfo {
  email: string;
  partner_name: string;
  partner_company: string;
}

export default function AcceptPartnerInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setError("Missing invitation token."); setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke("accept-partner-invite", { body: { action: "lookup", token } });
      if (error || !data?.invite) {
        setError(data?.error ?? "This invitation has expired or is no longer valid. Please ask an administrator to send a new invite.");
      } else {
        setInfo(data.invite);
      }
      setLoading(false);
    })();
  }, [token]);

  const accept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("accept-partner-invite", {
      body: { action: "accept", token, password },
    });
    setBusy(false);
    if (error || !data?.ok) { toast.error(data?.error ?? "Could not accept invitation"); return; }
    toast.success("Password set. You can now sign in.");
    navigate("/partner-portal");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><LoxxLogo size="lg" /></div>
        <div className="bg-card rounded-[10px] border shadow-card p-8">
          {loading ? (
            <div className="text-sm text-muted-foreground text-center">Loading invitation…</div>
          ) : error ? (
            <div className="text-sm text-center">
              <h1 className="text-xl font-semibold mb-2">Invitation unavailable</h1>
              <p className="text-muted-foreground">{error}</p>
            </div>
          ) : info ? (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-center">Set your partner password</h1>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Welcome, <strong>{info.partner_name}</strong>{info.partner_company ? <> from <strong>{info.partner_company}</strong></> : null}. Choose a password to access the My LOXX partner portal.
              </p>
              <form onSubmit={accept} className="space-y-3 mt-6">
                <div><Label>Email</Label><Input value={info.email} disabled /></div>
                <div>
                  <Label>Password</Label>
                  <Input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <p className="text-xs text-muted-foreground mt-1">Use at least 8 characters.</p>
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-[#d4820a] hover:bg-[#b86d08] text-white">
                  {busy ? "Setting password…" : "Set password & continue"}
                </Button>
              </form>
            </>
          ) : null}
        </div>
        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
