import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoxxLogo } from "@/components/LoxxLogo";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase creates a temporary recovery session when the user lands here
    // from the reset email. Detect it (via PASSWORD_RECOVERY event or an
    // already-hydrated session).
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      if (ok) setReady(true); else setInvalid(true);
    };

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session) finish(true);
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(true);
    });

    const t = setTimeout(() => finish(false), 2500);
    return () => { clearTimeout(t); sub.subscription.unsubscribe(); };
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    if (password !== confirm) { toast.error("Passwords do not match"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Password updated");
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><LoxxLogo size="lg" /></div>
        <div className="bg-card rounded-[10px] border shadow-card p-8">
          {invalid ? (
            <div className="text-sm text-center">
              <h1 className="text-xl font-semibold mb-2">Reset link invalid or expired</h1>
              <p className="text-muted-foreground">Please request a new password reset from the sign-in page.</p>
              <div className="mt-4">
                <Link to="/auth" className="text-primary hover:underline text-sm">Back to sign in</Link>
              </div>
            </div>
          ) : !ready ? (
            <div className="text-sm text-muted-foreground text-center">Verifying reset link…</div>
          ) : (
            <>
              <h1 className="text-2xl font-semibold tracking-tight text-center">Set a new password</h1>
              <p className="text-sm text-muted-foreground text-center mt-1">Choose a new password for your My LOXX account.</p>
              <form onSubmit={submit} className="space-y-3 mt-6">
                <div>
                  <Label htmlFor="new-password">New password</Label>
                  <Input id="new-password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required />
                  <p className="text-xs text-muted-foreground mt-1">Use at least 8 characters.</p>
                </div>
                <div>
                  <Label htmlFor="confirm-password">Confirm password</Label>
                  <Input id="confirm-password" type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
                </div>
                <Button type="submit" disabled={busy} className="w-full bg-primary hover:bg-primary/90">
                  {busy ? "Updating…" : "Update password"}
                </Button>
              </form>
            </>
          )}
        </div>
        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
