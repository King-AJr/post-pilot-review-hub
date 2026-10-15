import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/dashboard/States";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin — Content Ops" },
      { name: "description", content: "Invite teammates and manage access to Content Ops." },
      { property: "og:title", content: "Admin — Content Ops" },
      { property: "og:description", content: "Invite teammates and manage access to Content Ops." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Admin,
});

function Admin() {
  const { profile, session } = useAuth();
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [busy, setBusy] = useState(false);
  const isAdmin = profile?.role === "admin";

  const q = useQuery({
    queryKey: ["allowed_users"],
    enabled: isAdmin,
    queryFn: async () => {
      const [a, p] = await Promise.all([
        supabase.from("allowed_users").select("*").order("created_at"),
        supabase.from("profiles").select("email"),
      ]);
      if (a.error) throw a.error;
      const joined = new Set((p.data ?? []).map((x: { email: string | null }) => x.email));
      return (a.data ?? []).map((u: { email: string; role: string; created_at: string }) => ({ ...u, signedUp: joined.has(u.email) }));
    },
  });

  if (!profile) return <LoadingState text="Loading…" />;
  if (!isAdmin) return <EmptyState text="Admins only" />;

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.from("allowed_users").insert({
      email: email.trim().toLowerCase(), role, invited_by: session?.user.id ?? null,
    });
    setBusy(false);
    if (error) { toast.error(error.code === "23505" ? "That email is already invited" : error.message); return; }
    toast.success("Invited", { description: "They can now set their password on the sign-in page." });
    setEmail("");
    qc.invalidateQueries({ queryKey: ["allowed_users"] });
  }

  return (
    <>
      <PageHeader title="Admin" subtitle="Invite teammates. Invited people create their account from the sign-in page." />
      <form onSubmit={invite} className="mb-6 flex flex-wrap gap-2 rounded-lg border border-border bg-card p-4">
        <Input type="email" required placeholder="name@company.com" value={email} onChange={(e) => setEmail(e.target.value)} className="min-w-60 flex-1" />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" disabled={busy}>{busy && <Loader2 className="h-4 w-4 animate-spin" />} Invite</Button>
      </form>
      {q.isPending ? <LoadingState text="Loading users…" /> : q.isError ? (
        <ErrorState message={(q.error as Error).message} onRetry={() => q.refetch()} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Role</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Invited</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((u) => (
                <tr key={u.email} className="border-b border-border last:border-b-0">
                  <td className="px-4 py-3 font-medium">{u.email}</td>
                  <td className="px-4 py-3 capitalize">{u.role}</td>
                  <td className="px-4 py-3">{u.signedUp ? "Signed up" : <span className="text-muted-foreground">Pending</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{u.created_at.slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
