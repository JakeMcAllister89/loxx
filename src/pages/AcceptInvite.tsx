import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoxxLogo } from "@/components/LoxxLogo";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface InviteInfo {
  first_name: string;
  last_name: string;
  email: string;
  org_role: string;
  org_name: string;
}

export default function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";
  const [info, setInfo] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) { setError("Missing invitation token."); setLoading(false); return; }
    (async () => {
      const { data, error } = await supabase.functions.invoke("accept-invite", { body: { action: "lookup", token } });
      if (error || !data?.invite) {
        setError(data?.error ?? "This invitation has expired or is no longer valid. Please ask your administrator to send a new invite.");
      } else {
        setInfo(data.invite);
        setFirstName(data.invite.first_name);
        setLastName(data.invite.last_name);
      }
      setLoading(false);
    })();
  }, [token]);

  const accept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("accept-invite", {
      body: { action: "accept", token, first_name: firstName, last_name: lastName, password },
    });
    if (error || !data?.ok) { setBusy(false); toast.error(data?.error ?? "Could not accept invitation"); return; }
    // Sign in
    const { error: sErr } = await supabase.auth.signInWithPassword({ email: info!.email, password });
    setBusy(false);
    if (sErr) { toast.error(sErr.message); return; }
    toast.success("Welcome to LOXX");
    navigate("/dashboard");
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
              <h1 className="text-2xl font-semibold tracking-tight text-center">You've been invited</h1>
              <p className="text-sm text-muted-foreground text-center mt-1">
                Join <strong>{info.org_name}</strong> on LOXX as <strong>{info.org_role.replace("_"," ")}</strong>.
              </p>
              <form onSubmit={accept} className="space-y-3 mt-6">
                <div className="grid grid-cols-2 gap-3">
                  <div><Label>First name</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} required /></div>
                  <div><Label>Last name</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} required /></div>
                </div>
                <div><Label>Email</Label><Input value={info.email} disabled /></div>
                <div><Label>Password</Label><Input type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} required /></div>
                <Button type="submit" disabled={busy} className="w-full bg-[#d4820a] hover:bg-[#b86d08] text-white">
                  {busy ? "Creating account…" : "Accept & create account"}
                </Button>
              </form>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
