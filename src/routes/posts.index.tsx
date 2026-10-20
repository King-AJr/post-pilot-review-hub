import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchNestedPosts } from "@/lib/nested";
import { PlatformChip } from "@/components/dashboard/nested-ui";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/dashboard/States";

export const Route = createFileRoute("/posts/")({
  head: () => ({
    meta: [
      { title: "All Posts — Content Ops" },
      { name: "description", content: "Every post idea with the status of each platform version." },
      { property: "og:title", content: "All Posts — Content Ops" },
      { property: "og:description", content: "Every post idea with the status of each platform version." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostsList,
});

function PostsList() {
  const q = useQuery({ queryKey: ["nested-posts"], queryFn: () => fetchNestedPosts(), refetchInterval: 60_000, retry: 1 });

  return (
    <>
      <PageHeader title="All Posts" subtitle={q.data ? `${q.data.length} post idea${q.data.length === 1 ? "" : "s"}` : "Post ideas across platforms"}>
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </PageHeader>
      {q.isPending ? (
        <LoadingState text="Loading posts…" />
      ) : q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState text="No posts yet" />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {q.data.map((p) => (
            <Link
              key={p.post_id}
              to="/posts/$postId"
              params={{ postId: String(p.post_id) }}
              className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0 hover:bg-muted/50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{p.title}</p>
                {p.topic && <p className="truncate text-xs text-muted-foreground">{p.topic}</p>}
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {p.platforms.length ? p.platforms.map((v) => <PlatformChip key={v.post_platform_id} platform={v.platform} status={v.status} />) : <span className="text-xs text-muted-foreground">No platforms</span>}
                </div>
              </div>
              <span className="hidden font-mono text-xs text-muted-foreground sm:block">{p.created_at?.slice(0, 10)}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
