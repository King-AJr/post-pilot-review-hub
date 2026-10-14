import { Link } from "@tanstack/react-router";
import { ClipboardCheck, Factory, FilePlus2 } from "lucide-react";

const nav = [
  { to: "/", label: "Review Queue", icon: ClipboardCheck },
  { to: "/production", label: "Production Queue", icon: Factory },
  { to: "/add-source", label: "Add Source", icon: FilePlus2 },
] as const;

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="shrink-0 bg-sidebar text-sidebar-foreground md:sticky md:top-0 md:h-screen md:w-60">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="h-2.5 w-2.5 rounded-sm bg-sidebar-primary" />
          <span className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-sidebar-accent-foreground">
            Content Ops
          </span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-col md:pb-0">
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
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
