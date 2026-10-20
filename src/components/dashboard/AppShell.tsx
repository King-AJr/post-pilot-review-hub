import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, Factory, LayoutList, FilePlus2, LogOut, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/use-auth";

const baseNav = [
  { to: "/", label: "Review Queue", icon: ClipboardCheck },
  { to: "/production", label: "Production Queue", icon: Factory },
  { to: "/posts", label: "All Posts", icon: LayoutList },
  { to: "/add-source", label: "Add Source", icon: FilePlus2 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { session, profile, signOut } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const nav = profile?.role === "admin"
    ? [...baseNav, { to: "/admin", label: "Admin", icon: ShieldCheck } as const]
    : baseNav;

  async function out() {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-60">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="h-2.5 w-2.5 rounded-sm bg-sidebar-primary" />
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-accent-foreground">
            Content Ops
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:pb-0">
          {nav.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: true }}
              className="flex items-center gap-2.5 whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-accent-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center justify-between gap-2 border-t border-sidebar-border px-5 py-4">
          <div className="min-w-0">
            <p className="truncate text-xs text-sidebar-accent-foreground">{session?.user.email}</p>
            <p className="font-mono text-[10px] uppercase tracking-wide opacity-70">{profile?.role ?? "…"}</p>
          </div>
          <button onClick={out} title="Sign out" className="rounded-md p-1.5 hover:bg-sidebar-accent">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
