import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchPosts, type Post } from "@/lib/api";
import { fetchNestedPosts, reviewPlatform, type NestedPost, type PlatformVariant } from "@/lib/nested";
import { PostCard } from "@/components/dashboard/PostCard";
import { VariantReviewCard } from "@/components/dashboard/VariantReviewCard";
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

const OLD_KEY = ["posts", "draft"];
const NEW_KEY = ["nested-posts"];
const REVIEWABLE: PlatformVariant["status"][] = ["draft", "rejected"];

type ReviewItem =
  | { kind: "old"; key: string; sortTime: number; post: Post }
  | { kind: "new"; key: string; sortTime: number; post: NestedPost; variant: PlatformVariant; reviewableSiblingIds: (string | number)[] };

function ReviewQueue() {
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: OLD_KEY,
    queryFn: () => fetchPosts("draft"),
    refetchInterval: 60_000,
    retry: 1,
  });
  const nested = useQuery({
    queryKey: NEW_KEY,
    queryFn: () => fetchNestedPosts(),
    refetchInterval: 60_000,
    retry: 1,
  });

  const removeOld = (postId: string) =>
    qc.setQueryData<Post[]>(OLD_KEY, (old) => old?.filter((p) => p.post_id !== postId));

  const removeVariant = (post_platform_id: string | number) =>
    qc.setQueryData<NestedPost[]>(NEW_KEY, (old) =>
      old?.map((p) => ({ ...p, platforms: p.platforms.filter((v) => v.post_platform_id !== post_platform_id) })),
    );

  const approveAllPlatforms = async (post: NestedPost, variantIds: (string | number)[]) => {
    await Promise.all(variantIds.map((id) => reviewPlatform({ post_platform_id: id, action: "approve" })));
    qc.setQueryData<NestedPost[]>(NEW_KEY, (old) =>
      old?.map((p) =>
        p.post_id === post.post_id
          ? { ...p, platforms: p.platforms.filter((v) => !variantIds.includes(v.post_platform_id)) }
          : p,
      ),
    );
  };

  const isPending = q.isPending || nested.isPending;
  const isError = q.isError || nested.isError;
  const errorMessage = q.error?.message || nested.error?.message || "Something went wrong";
  const isFetching = q.isFetching || nested.isFetching;

  const items: ReviewItem[] = [];
  // The old-model Post type doesn't declare a created_at field, but the underlying
  // n8n Data Table row carries one (updatedAt/createdAt) that the API passes through
  // untyped — read it off so old and new rows interleave by real recency instead of
  // old rows always floating to the top (or bottom).
  for (const p of q.data ?? []) {
    const raw = p as unknown as { updatedAt?: string; createdAt?: string };
    const sortTime = Date.parse(raw.updatedAt || raw.createdAt || "") || 0;
    items.push({ kind: "old", key: `old-${p.post_id}`, sortTime, post: p });
  }
  for (const post of nested.data ?? []) {
    const reviewable = post.platforms.filter((v) => REVIEWABLE.includes(v.status));
    const sortTime = post.created_at ? Date.parse(post.created_at) || 0 : 0;
    for (const variant of reviewable) {
      items.push({
        kind: "new",
        key: `new-${variant.post_platform_id}`,
        sortTime,
        post,
        variant,
        reviewableSiblingIds: reviewable.filter((v) => v.post_platform_id !== variant.post_platform_id).map((v) => v.post_platform_id),
      });
    }
  }
  items.sort((a, b) => b.sortTime - a.sortTime);

  const count = items.length;
  const nestedPostIds = new Set((nested.data ?? []).filter((p) => p.platforms.length > 0).map((p) => String(p.post_id)));

  return (
    <>
      <PageHeader
        title="Review Queue"
        subtitle={!isPending ? `${count} item${count === 1 ? "" : "s"} awaiting review · auto-refreshes every 60s` : "Posts and platform versions awaiting review"}
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
        <LoadingState text="Loading review queue…" />
      ) : isError ? (
        <ErrorState
          message={errorMessage}
          onRetry={() => {
            q.refetch();
            nested.refetch();
          }}
        />
      ) : items.length === 0 ? (
        <EmptyState text="Nothing waiting for review" />
      ) : (
        <div className="space-y-4">
          {items.map((item) =>
            item.kind === "old" ? (
              <PostCard key={item.key} post={item.post} onDone={removeOld} hasDetails={nestedPostIds.has(String(item.post.post_id))} />
            ) : (
              <VariantReviewCard
                key={item.key}
                post={item.post}
                variant={item.variant}
                reviewableSiblingCount={item.reviewableSiblingIds.length}
                onApproveAllPlatforms={() => approveAllPlatforms(item.post, [item.variant.post_platform_id, ...item.reviewableSiblingIds])}
                onDone={removeVariant}
              />
            ),
          )}
        </div>
      )}
    </>
  );
}
