import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ExternalLink, Loader2, MessageSquare, X } from "lucide-react";
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
import { reviewPost, type Post } from "@/lib/api";
import { Tag } from "./Tag";

type Mode = null | "approve" | "revise" | "reject";
const DEFAULT_ASSIGNEE = "talk2king.aj@gmail.com";

export function PostCard({ post, onDone }: { post: Post; onDone: (postId: string) => void }) {
  const [mode, setMode] = useState<Mode>(null);
  const [busy, setBusy] = useState(false);
  const [assignee, setAssignee] = useState(post.assignee_email || DEFAULT_ASSIGNEE);
  const [due, setDue] = useState(post.due_date?.slice(0, 10) ?? "");
  const [feedback, setFeedback] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  const isLink = post.source_ref && /^https?:\/\//.test(post.source_ref);

  async function submit(action: "approve" | "revise" | "reject") {
    setBusy(true);
    try {
      await reviewPost({
        post_id: post.post_id,
        action,
        ...(action === "approve" && {
          assignee_email: assignee.trim() || undefined,
          due_date: due || undefined,
        }),
        ...(action === "revise" && { feedback: feedback.trim() }),
        ...(action === "reject" && rejectNote.trim() && { feedback: rejectNote.trim() }),
      });
      toast.success(
        action === "approve"
          ? "Approved and sent to production"
          : action === "revise"
            ? "Revision requested — the rewrite will appear on a later refresh"
            : "Post rejected",
      );
      setMode(null);
      onDone(post.post_id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        <Tag value={post.category} kind="category" />
        <Tag value={post.content_type} />
        <Tag value={post.platform} kind="outline" />
        {!!post.revision_count && post.revision_count > 0 && (
          <span className="ml-auto font-mono text-[11px] text-muted-foreground">
            Revision #{post.revision_count}
          </span>
        )}
      </div>

      <h2 className="mt-3 text-base font-semibold leading-snug">{post.title}</h2>
      <Link to="/posts/$postId" params={{ postId: String(post.post_id) }} className="mt-1 inline-block text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
        View details →
      </Link>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/85">
        {post.caption}
      </p>

      {post.reviewer_feedback && (
        <div className="mt-4 rounded-md border-l-2 border-warning bg-muted px-3 py-2 text-xs">
          <span className="font-mono uppercase tracking-wide text-muted-foreground">
            Previous feedback
          </span>
          <p className="mt-1 text-foreground/80">{post.reviewer_feedback}</p>
        </div>
      )}

      {post.source_ref && (
        <div className="mt-3 text-xs text-muted-foreground">
          Source:{" "}
          {isLink ? (
            <a
              href={post.source_ref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline"
            >
              {post.source_ref.replace(/^https?:\/\//, "").slice(0, 60)}
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="font-mono">{post.source_ref}</span>
          )}
        </div>
      )}

      {mode === "approve" && (
        <div className="mt-4 grid gap-3 rounded-md bg-muted p-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`a-${post.post_id}`} className="text-xs">Assignee email</Label>
            <Input id={`a-${post.post_id}`} type="email" value={assignee} onChange={(e) => setAssignee(e.target.value)} className="bg-card" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`d-${post.post_id}`} className="text-xs">Due date</Label>
            <Input id={`d-${post.post_id}`} type="date" value={due} onChange={(e) => setDue(e.target.value)} className="bg-card" />
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" onClick={() => submit("approve")} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Confirm approval
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)} disabled={busy}>Cancel</Button>
          </div>
        </div>
      )}

      {mode === "revise" && (
        <div className="mt-4 space-y-2 rounded-md bg-muted p-3">
          <Label htmlFor={`f-${post.post_id}`} className="text-xs">What should change?</Label>
          <Textarea
            id={`f-${post.post_id}`}
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
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
          <Button size="sm" onClick={() => setMode("approve")}>
            <Check className="h-3.5 w-3.5" /> Approve
          </Button>
          <Button size="sm" variant="outline" onClick={() => setMode("revise")}>
            <MessageSquare className="h-3.5 w-3.5" /> Request changes
          </Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setMode("reject")}>
            <X className="h-3.5 w-3.5" /> Reject
          </Button>
        </div>
      )}

      <AlertDialog open={mode === "reject"} onOpenChange={(o) => !o && !busy && setMode(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject this post?</AlertDialogTitle>
            <AlertDialogDescription>“{post.title}” will be removed from the review queue.</AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea rows={3} placeholder="Reason (optional)" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} disabled={busy} />
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <Button variant="destructive" onClick={() => submit("reject")} disabled={busy}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Reject post
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
