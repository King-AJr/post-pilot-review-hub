import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPosts, label } from "@/lib/api";
import { Tag } from "@/components/dashboard/Tag";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/dashboard/States";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/production")({
  head: () => ({
    meta: [
      { title: "Production Queue — Content Ops" },
      { name: "description", content: "Approved posts in production, with owners, due dates and reminders." },
      { property: "og:title", content: "Production Queue — Content Ops" },
      { property: "og:description", content: "Approved posts in production, with owners, due dates and reminders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Production,
});

function isOverdue(d?: string | null) {
  if (!d) return false;
  const today = new Date().toISOString().slice(0, 10);
  return d.slice(0, 10) < today;
}

function Production() {
  const q = useQuery({
    queryKey: ["posts", "in_production"],
    queryFn: () => fetchPosts("in_production"),
    refetchInterval: 60_000,
    retry: 1,
  });

  const overdue = q.data?.filter((p) => isOverdue(p.due_date)).length ?? 0;

  return (
    <>
      <PageHeader
        title="Production Queue"
        subtitle={q.data ? `${q.data.length} in production${overdue ? ` · ${overdue} overdue` : ""}` : "Approved posts being produced"}
      >
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </PageHeader>
      {q.isPending ? (
        <LoadingState text="Loading production queue…" />
      ) : q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState text="Nothing in production right now" />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Platform</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Assignee</th>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Reminders</th>
              </tr>
            </thead>
            <tbody>
              {q.data.map((p) => {
                const late = isOverdue(p.due_date);
                return (
                  <tr
                    key={p.post_id}
                    className={cn(
                      "border-b border-border border-l-[3px] last:border-b-0",
                      late ? "border-l-destructive bg-destructive/5" : "border-l-transparent",
                    )}
                  >
                    <td className="px-4 py-3 font-medium">{p.title}</td>
                    <td className="px-4 py-3"><Tag value={p.platform} kind="outline" /></td>
                    <td className="px-4 py-3"><Tag value={p.content_type} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{p.assignee_email || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={cn("font-mono text-xs", late && "text-destructive")}>
                        {p.due_date ? p.due_date.slice(0, 10) : label(null)}
                      </span>
                      {late && (
                        <span className="ml-2 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive-foreground">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {p.ping_count && p.ping_count > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-tag-orange px-2 py-0.5 text-xs text-tag-orange-fg">
                          <BellRing className="h-3 w-3" />
                          {p.ping_count} reminder{p.ping_count === 1 ? "" : "s"} sent
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
