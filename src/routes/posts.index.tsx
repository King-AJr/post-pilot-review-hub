import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchNestedPosts, CONTENT_TYPES, PLATFORMS, type VariantStatus } from "@/lib/nested";
import { label } from "@/lib/api";
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

type StatusFilter = "all" | VariantStatus | "published";

const selCls = "h-9 rounded-md border border-input bg-background px-2 text-sm";

function PostsList() {
  const q = useQuery({ queryKey: ["nested-posts"], queryFn: () => fetchNestedPosts(), refetchInterval: 60_000, retry: 1 });

  const [status, setStatus] = useState<StatusFilter>("all");
  const [platform, setPlatform] = useState<string>("all");
  const [contentType, setContentType] = useState<string>("all");

  const filtered = useMemo(() => {
    const posts = q.data ?? [];
    if (status === "all" && platform === "all" && contentType === "all") return posts;
    return posts.filter((p) =>
      p.platforms.some((v) => {
        if (platform !== "all" && v.platform !== platform) return false;
        if (contentType !== "all" && v.content_type !== contentType) return false;
        if (status === "published") return !!v.published_at;
        if (status !== "all" && v.status !== status) return false;
        return true;
      }),
    );
  }, [q.data, status, platform, contentType]);

  const filtersActive = status !== "all" || platform !== "all" || contentType !== "all";

  return (
    <>
      <PageHeader
        title="All Posts"
        subtitle={
          q.data
            ? `${filtered.length} of ${q.data.length} post idea${q.data.length === 1 ? "" : "s"}${filtersActive ? " (filtered)" : ""}`
            : "Post ideas across platforms"
        }
      >
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <select className={selCls} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)}>
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="published">Published</option>
        </select>
        <select className={selCls} value={platform} onChange={(e) => setPlatform(e.target.value)}>
          <option value="all">All platforms</option>
          {PLATFORMS.map((p) => <option key={p} value={p}>{label(p)}</option>)}
        </select>
        <select className={selCls} value={contentType} onChange={(e) => setContentType(e.target.value)}>
          <option value="all">All content types</option>
          {CONTENT_TYPES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
        </select>
        {filtersActive && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setStatus("all");
              setPlatform("all");
              setContentType("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {q.isPending ? (
        <LoadingState text="Loading posts…" />
      ) : q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
      ) : filtered.length === 0 ? (
        <EmptyState text={filtersActive ? "No posts match these filters" : "No posts yet"} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {filtered.map((p) => {
            const visiblePlatforms = filtersActive
              ? p.platforms.filter((v) => {
                  if (platform !== "all" && v.platform !== platform) return false;
                  if (contentType !== "all" && v.content_type !== contentType) return false;
                  if (status === "published") return !!v.published_at;
                  if (status !== "all" && v.status !== status) return false;
                  return true;
                })
              : p.platforms;
            return (
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
                    {visiblePlatforms.length ? (
                      visiblePlatforms.map((v) => <PlatformChip key={v.post_platform_id} platform={v.platform} status={v.status} />)
                    ) : (
                      <span className="text-xs text-muted-foreground">No matching platforms</span>
                    )}
                  </div>
                </div>
                <span className="hidden font-mono text-xs text-muted-foreground sm:block">{p.created_at?.slice(0, 10)}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
