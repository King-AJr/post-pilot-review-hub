import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, CheckCheck, Layers, Loader2, MessageSquare, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { label } from "@/lib/api";
import { reviewPlatform, type NestedPost, type PlatformVariant } from "@/lib/nested";
import { variantPreview } from "@/lib/variant-preview";
import { PlatformChip } from "./nested-ui";

const DEFAULT_ASSIGNEE = "talk2king.aj@gmail.com";

type Mode = null | "approve" | "revise" | "reject";

/**
 * A single review row for one platform variant of a multi-platform post.
 * Visually distinguished from legacy PostCard rows with a "Multi-platform" badge,
 * but lives in the same scrollable review list.
 *
 * When the parent post has more than one platform still awaiting review, this row
 * also exposes a post-level "Approve all platforms" action so it's clear whether an
 * action is scoped to just this platform or should apply to every platform of the post.
 */
export function VariantReviewCard({
  post,
  variant,
  reviewableSiblingCount,
  onApproveAllPlatforms,
  onDone,
}: {
  post: NestedPost;
  variant: PlatformVariant;
  /** Number of OTHER platform variants on this post that are also still awaiting review. */
  reviewableSiblingCount: number;
  onApproveAllPlatforms: () => Promise<void>;
  onDone: (post_platform_id: string | number) => void;
}) {
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [assignee, setAssignee] = useState(variant.assignee_email || DEFAULT_ASSIGNEE);
  const [scheduled, setScheduled] = useState(variant.scheduled_date?.slice(0, 10) ?? "");
  const [feedback, setFeedback] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  async function submit(action: "approve" | "revise" | "reject") {
    setBusy(true);
    try {
      await reviewPlatform({
        post_platform_id: variant.post_platform_id,
        action,
        ...(action === "approve" && {
          ...(assignee.trim() && { assignee_email: assignee.trim() }),
          ...(scheduled && { scheduled_date: scheduled }),
        }),
        ...(action === "revise" && { feedback: feedback.trim() }),
        ...(action === "reject" && rejectNote.trim() && { feedback: rejectNote.trim() }),
      });
      toast.success(
        action === "approve"
          ? "Approved and sent to production"
          : action === "revise"
            ? "Revision requested — the rewrite will appear on a later refresh"
            : "Platform version rejected",
      );
      setMode(null);
      onDone(variant.post_platform_id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function approveAll() {
    setBulkBusy(true);
    try {
      await onApproveAllPlatforms();
      toast.success("All platforms approved and sent to production");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't approve every platform");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded bg-tag-blue px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide text-tag-blue-fg">
          <Layers className="h-3 w-3" /> Multi-platform
        </span>
        <PlatformChip platform={variant.platform} status={variant.status} />
        <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          {label(variant.content_type)}
        </span>
        {!!variant.revision_count && variant.revision_count > 0 && (
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            Revision #{variant.revision_count}
          </span>
        )}
      </div>

      <h2 className="mt-3 text-base font-semibold leading-snug">{post.title}</h2>
      <Link
        to="/posts/$postId"
        params={{ postId: String(post.post_id) }}
        className="mt-1 inline-block text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        View details →
      </Link>

      <p className="mt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        This review is for {label(variant.platform)} only
        {reviewableSiblingCount > 0 ? ` · ${reviewableSiblingCount} other platform${reviewableSiblingCount === 1 ? "" : "s"} also awaiting review` : ""}
      </p>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
        {variantPreview(variant)}
      </p>

      {variant.reviewer_feedback && (
        <div className="mt-4 rounded-md border-l-2 border-warning bg-muted px-3 py-2 text-xs">
          <span className="font-mono uppercase tracking-wide text-muted-foreground">Previous feedback</span>
          <p className="mt-1 text-foreground/80">{variant.reviewer_feedback}</p>
        </div>
      )}

      {mode === "approve" && (
        <div className="mt-4 grid gap-3 rounded-md bg-muted p-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`va-${variant.post_platform_id}`} className="text-xs">Assignee email</Label>
            <Input id={`va-${variant.post_platform_id}`} type="email" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="bg-card" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`vd-${variant.post_platform_id}`} className="text-xs">Scheduled date</Label>
            <Input id={`vd-${variant.post_platform_id}`} type="date" value={scheduled} onChange={(e) => setScheduled(e.target.value)} className="bg-card" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" onClick={() => submit("approve")} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Confirm approval for {label(variant.platform)}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)} disabled={busy}>Cancel</Button>
          </div>
        </div>
      )}

      {mode === "revise" && (
        <div className="mt-4 space-y-2 rounded-md bg-muted p-3">
          <Label htmlFor={`vf-${variant.post_platform_id}`} className="text-xs">What should change on {label(variant.platform)}?</Label>
          <Textarea
            id={`vf-${variant.post_platform_id}`}
            rows={3}
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="e.g. Shorter hook, mention the hackathon winners by team name"
            className="bg-card"
            disabled={busy}
          />
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => submit("revise")} disabled={busy || !feedback.trim()}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {busy ? "Rewriting…" : "Send for revision"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)} disabled={busy}>Cancel</Button>
            {busy && <span className="text-xs text-muted-foreground">The AI rewrite can take a few seconds.</span>}
          </div>
        </div>
      )}

      {mode === null && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button size="sm" onClick={() => setMode("approve")}>
            <Check className="h-3.5 w-3.5" /> Approve {label(variant.platform)}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode("revise")}>
            <MessageSquare className="h-3.5 w-3.5" /> Request changes
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setMode("reject")}>
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
          {reviewableSiblingCount > 0 && (
            <Button size="sm" variant="secondary" className="ml-auto" onClick={approveAll} disabled={bulkBusy}>
              {bulkBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Approve all {reviewableSiblingCount + 1} platforms for this post
            </Button>
          )}
        </div>
      )}

      <AlertDialog open={mode === "reject"} onOpenChange={(o) => !o && !busy && setMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject the {label(variant.platform)} version?</AlertDialogTitle>
            <AlertDialogDescription>
              Only the {label(variant.platform)} version of "{post.title}" will be rejected — other platforms are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea rows={3} placeholder="Reason (optional)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} disabled={busy} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => submit("reject")} disabled={busy}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Reject {label(variant.platform)} version
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
