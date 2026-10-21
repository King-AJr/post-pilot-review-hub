import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BellRing, Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPosts, label, type Post } from "@/lib/api";
import { fetchNestedPosts, type NestedPost, type PlatformVariant } from "@/lib/nested";
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

type Row =
  | { kind: "old"; key: string; post: Post }
  | { kind: "new"; key: string; post: NestedPost; variant: PlatformVariant };

function Production() {
  const q = useQuery({
    queryKey: ["posts", "in_production"],
    queryFn: () => fetchPosts("in_production"),
    refetchInterval: 60_000,
    retry: 1,
  });
  const nested = useQuery({
    queryKey: ["nested-posts"],
    queryFn: () => fetchNestedPosts(),
    refetchInterval: 60_000,
    retry: 1,
  });

  const isPending = q.isPending || nested.isPending;
  const isError = q.isError || nested.isError;
  const errorMessage = q.error?.message || nested.error?.message || "Something went wrong";
  const isFetching = q.isFetching || nested.isFetching;

  const rows: Row[] = [
    ...(q.data ?? []).map((p): Row => ({ kind: "old", key: `old-${p.post_id}`, post: p })),
    ...(nested.data ?? []).flatMap((post) =>
      post.platforms
        .filter((v) => v.status === "approved")
        .map((variant): Row => ({ kind: "new", key: `new-${variant.post_platform_id}`, post, variant })),
    ),
  ];

  const overdue = rows.filter((r) => isOverdue(r.kind === "old" ? r.post.due_date : r.variant.scheduled_date)).length;

  return (
    <>
      <PageHeader
        title="Production Queue"
        subtitle={!isPending ? `${rows.length} in production${overdue ? ` · ${overdue} overdue` : ""}` : "Approved posts being produced"}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            q.refetch();
            nested.refetch();
          }}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </PageHeader>
      {isPending ? (
        <LoadingState text="Loading production queue…" />
      ) : isError ? (
        <ErrorState
          message={errorMessage}
          onRetry={() => {
            q.refetch();
            nested.refetch();
          }}
        />
      ) : rows.length === 0 ? (
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
              {rows.map((r) => {
                const due = r.kind === "old" ? r.post.due_date : r.variant.scheduled_date;
                const platform = r.kind === "old" ? r.post.platform : r.variant.platform;
                const contentType = r.kind === "old" ? r.post.content_type : r.variant.content_type;
                const assignee = r.kind === "old" ? r.post.assignee_email : r.variant.assignee_email;
                const pingCount = r.kind === "old" ? r.post.ping_count : null;
                const late = isOverdue(due);
                return (
                  <tr
                    key={r.key}
                    className={cn(
                      "border-b border-border border-l-[3px] last:border-b-0",
                      late ? "border-l-destructive bg-destructive/5" : "border-l-transparent",
                    )}
                  >
                    <td className="px-4 py-3 font-medium">
                      {r.kind === "new" ? (
                        <Link to="/posts/$postId" params={{ postId: String(r.post.post_id) }} className="inline-flex items-center gap-1.5 hover:underline">
                          <Layers className="h-3 w-3 shrink-0 text-muted-foreground" />
                          {r.post.title}
                        </Link>
                      ) : (
                        r.post.title
                      )}
                    </td>
                    <td className="px-4 py-3"><Tag value={platform} kind="outline" /></td>
                    <td className="px-4 py-3"><Tag value={contentType} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{assignee || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <span className={cn("font-mono text-xs", late && "text-destructive")}>
                        {due ? due.slice(0, 10) : label(null)}
                      </span>
                      {late && (
                        <span className="ml-2 rounded bg-destructive px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive-foreground">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {pingCount && pingCount > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-tag-orange px-2 py-0.5 text-xs text-tag-orange-fg">
                          <BellRing className="h-3 w-3" />
                          {pingCount} reminder{pingCount === 1 ? "" : "s"} sent
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
