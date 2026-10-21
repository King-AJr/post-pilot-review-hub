import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPosts, type Post } from "@/lib/api";
import { fetchNestedPosts } from "@/lib/nested";
import { PostCard } from "@/components/dashboard/PostCard";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/dashboard/States";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Review Queue — Content Ops" },
      { name: "description", content: "Review, approve, revise or reject drafted social posts." },
      { property: "og:title", content: "Review Queue — Content Ops" },
      { property: "og:description", content: "Review, approve, revise or reject drafted social posts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ReviewQueue,
});

const KEY = ["posts", "draft"];

function ReviewQueue() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: KEY,
    queryFn: () => fetchPosts("draft"),
    refetchInterval: 60_000,
    retry: 1,
  });
  const nested = useQuery({
    queryKey: ["nested-post-ids"],
    queryFn: async () => new Set((await fetchNestedPosts()).filter((p) => p.platforms.length > 0).map((p) => String(p.post_id))),
    retry: 1,
    staleTime: 60_000,
  });

  const remove = (postId: string) =>
    qc.setQueryData<Post[]>(KEY, (old) => old?.filter((p) => p.post_id !== postId));

  return (
    <>
      <PageHeader
        title="Review Queue"
        subtitle={q.data ? `${q.data.length} draft${q.data.length === 1 ? "" : "s"} awaiting review · auto-refreshes every 60s` : "Drafts awaiting review"}
      >
        <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
          <RefreshCw className={`h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </PageHeader>
      {q.isPending ? (
        <LoadingState text="Loading drafts…" />
      ) : q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
      ) : q.data.length === 0 ? (
        <EmptyState text="No drafts waiting for review" />
      ) : (
        <div className="space-y-4">
          {q.data.map((p) => (
            <PostCard key={p.post_id} post={p} onDone={remove} hasDetails={nested.data?.has(String(p.post_id)) ?? false} />
          ))}
        </div>
      )}
    </>
  );
}
