import { useState, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthGate({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth();
  if (loading)
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;
  if (!session) return <AuthForm />;
  return <>{children}</>;
}

function AuthForm() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null); setInfo(null);
    const em = email.trim().toLowerCase();
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword({ email: em, password });
      if (error) setError(error.message);
      else qc.clear();
    } else {
      const { data, error } = await supabase.auth.signUp({ email: em, password, options: { emailRedirectTo: window.location.origin } });
      if (error) {
        setError(/database error|not_invited|saving new user/i.test(error.message)
          ? "This email hasn't been invited. Ask your admin for access."
          : error.message);
      } else if (!data.session) {
        setInfo("Account created. Check your email to confirm, then sign in.");
        setMode("in");
      }
    }
    setBusy(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-sm bg-primary" />
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em]">Content Ops</span>
        </div>
        <form onSubmit={submit} className="space-y-4 rounded-lg border border-border bg-card p-6">
          <h1 className="text-lg font-semibold">{mode === "in" ? "Sign in" : "Set up your account"}</h1>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pw">Password</Label>
            <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
          {info && <p className="rounded-md bg-muted px-3 py-2 text-sm">{info}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} {mode === "in" ? "Sign in" : "Create account"}
          </Button>
        </form>
        <p className="mt-4 text-xs text-muted-foreground">
          {mode === "in" ? (
            <>First time? You need an invite from an admin. Once invited,{" "}
              <button className="underline" onClick={() => { setMode("up"); setError(null); }}>set your password here</button>.</>
          ) : (
            <button className="underline" onClick={() => { setMode("in"); setError(null); }}>Back to sign in</button>
          )}
        </p>
      </div>
    </div>
  );
}
