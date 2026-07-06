import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoxxLogo } from "@/components/LoxxLogo";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

export default function Auth() {
  const [params, setParams] = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">(params.get("mode") === "signup" ? "signup" : "login");
  const refPartnerId = params.get("ref") || null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [company, setCompany] = useState("");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const location = useLocation();

  const rawNext = params.get("next");
  const nextPath = rawNext && rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  useEffect(() => {
    if (user && (location.pathname === "/auth" || location.pathname === "/")) {
      navigate(nextPath, { replace: true });
    }
  }, [user, navigate, location.pathname, nextPath]);

  const switchMode = (m: "login" | "signup") => { setMode(m); setParams({ mode: m }); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin + nextPath,
            data: {
              first_name: firstName,
              last_name: lastName,
              name: `${firstName} ${lastName}`.trim(),
              company,
              role: "facility_manager",
              referred_by_partner_id: refPartnerId,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created. You're signed in.");
        setTimeout(() => {
          supabase.functions.invoke("notify-new-signup", {
            body: { source: "auth_signup", email },
          }).catch(() => {});
        }, 3000);
        navigate(nextPath);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(nextPath);
      }
    } catch (err: any) {
      toast.error(err.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + nextPath });
    if (res.error) { toast.error(res.error.message ?? "Google sign-in failed"); setBusy(false); }
    if (!res.redirected && !res.error) navigate(nextPath);
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = forgotEmail.trim();
    if (!target) return;
    setForgotBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(target, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setForgotBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("If that account exists, a reset link is on its way.");
    setForgotOpen(false);
    setForgotEmail("");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-6"><LoxxLogo size="lg" /></div>
        <div className="bg-card rounded-[10px] border shadow-card p-8">
          <h1 className="text-2xl font-semibold tracking-tight text-center">
            {mode === "login" ? "Sign in to My LOXX" : "Create your My LOXX account"}
          </h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            {mode === "login" ? "Welcome back." : "Set up your organisation and start managing your master key system."}
          </p>
          {mode === "signup" && (
            <p className="text-sm text-muted-foreground text-center mt-1">
              Free to start. No card required. No software subscription — you only pay when you order hardware.
            </p>
          )}

          <Button type="button" variant="outline" className="w-full mt-6" onClick={google} disabled={busy}>
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M23 12.27c0-.86-.08-1.69-.22-2.5H12v4.73h6.18c-.27 1.4-1.07 2.59-2.28 3.39v2.82h3.69C21.74 18.81 23 15.83 23 12.27z"/><path fill="#34A853" d="M12 23c3.08 0 5.66-1.02 7.55-2.76l-3.69-2.82c-1.02.68-2.32 1.09-3.86 1.09-2.97 0-5.49-2-6.39-4.69H1.79v2.95C3.66 20.43 7.55 23 12 23z"/><path fill="#FBBC05" d="M5.61 13.82A6.91 6.91 0 0 1 5.24 12c0-.63.11-1.25.31-1.82V7.23H1.79A11 11 0 0 0 1 12c0 1.77.42 3.45 1.17 4.95l3.44-2.13z"/><path fill="#EA4335" d="M12 5.27c1.68 0 3.18.58 4.36 1.7l3.27-3.27C17.66 1.86 15.08 1 12 1 7.55 1 3.66 3.57 1.79 7.23l3.82 2.95C6.51 7.27 9.03 5.27 12 5.27z"/></svg>
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            {mode === "signup" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="firstName">First name</Label>
                    <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last name</Label>
                    <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="company">Organisation name</Label>
                  <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} required />
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
              {mode === "signup" && (
                <p className="text-xs text-muted-foreground mt-1">Use at least 8 characters.</p>
              )}
            </div>
            <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={busy}>
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          {mode === "signup" && (
            <p className="text-xs text-center text-muted-foreground mt-4">
              By creating an account, you agree to the{" "}
              <Link to="/terms" className="text-primary hover:underline">Terms</Link>
              {" "}and{" "}
              <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          )}

          <div className="text-sm text-center mt-5 text-muted-foreground">
            {mode === "login" ? (
              <>No account? <button className="text-primary hover:underline" onClick={() => switchMode("signup")}>Sign up</button></>
            ) : (
              <>Already have an account? <button className="text-primary hover:underline" onClick={() => switchMode("login")}>Sign in</button></>
            )}
          </div>
        </div>
        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
