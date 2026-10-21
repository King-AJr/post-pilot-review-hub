import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { diffWords, type DiffToken } from "@/lib/diff";
import { fetchPlatformRevisions, hashtagsText, type PlatformVariant } from "@/lib/nested";

function DiffText({ tokens }: { tokens: DiffToken[] }) {
  return (
    <>
      {tokens.map((t, idx) => (
        <span
          key={idx}
          className={
            t.type === "removed"
              ? "bg-destructive/15 text-destructive line-through"
              : t.type === "added"
                ? "bg-tag-green text-tag-green-fg"
                : undefined
          }
        >
          {t.text}
        </span>
      ))}
    </>
  );
}

function FieldDiff({ name, oldValue, newValue }: { name: string; oldValue: string; newValue: string }) {
  if (oldValue === newValue) return null;
  const { oldTokens, newTokens } = diffWords(oldValue, newValue);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{name} — before</p>
        <p className="whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-sm">
          {oldValue ? <DiffText tokens={oldTokens} /> : <span className="text-muted-foreground">—</span>}
        </p>
      </div>
      <div>
        <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{name} — after</p>
        <p className="whitespace-pre-wrap rounded-md bg-muted/60 p-2 text-sm">
          {newValue ? <DiffText tokens={newTokens} /> : <span className="text-muted-foreground">—</span>}
        </p>
      </div>
    </div>
  );
}

/**
 * Shows past versions of a platform variant's caption/hashtags/cta, each paired with
 * the feedback that triggered the change, newest first. Diffs each old version against
 * the version that replaced it (the next revision, or the current live content for the
 * most recent snapshot).
 */
export function RevisionHistory({ variant }: { variant: PlatformVariant }) {
  const [open, setOpen] = useState(false);
  const q = useQuery({
    queryKey: ["platform-revisions", variant.post_platform_id],
    queryFn: () => fetchPlatformRevisions(variant.post_platform_id),
    enabled: open,
    retry: 1,
  });

  if (!variant.revision_count) return null;

  // Newest-first list of {caption,hashtags,cta} snapshots that existed before each revise,
  // paired with what each was replaced by (the next snapshot, or the current live content).
  const revisions = q.data ?? [];

  return (
    <div className="border-t border-border pt-4">
      <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
        <History className="h-3.5 w-3.5" />
        {open ? "Hide" : "Show"} revision history ({variant.revision_count})
      </Button>
      {open && (
        <div className="mt-3 space-y-4">
          {q.isPending ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading history…
            </div>
          ) : q.isError ? (
            <p className="text-xs text-destructive">{q.error instanceof Error ? q.error.message : "Couldn't load history"}</p>
          ) : revisions.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No stored snapshots yet — history tracking started after this variant's last revision. Future revisions will show up here.
            </p>
          ) : (
            revisions.map((rev, idx) => {
              const next = revisions[idx - 1]; // one newer than rev, or undefined if rev is the latest snapshot
              const afterCaption = next?.caption ?? variant.caption ?? "";
              const afterHashtags = next ? hashtagsText(next.hashtags) : hashtagsText(variant.hashtags);
              const afterCta = next?.cta ?? variant.cta ?? "";
              return (
                <div key={rev.revision_number} className="rounded-md border border-border p-3">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                      Version {rev.revision_number + 1} → {rev.revision_number + 2}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{rev.created_at ? new Date(rev.created_at).toLocaleString() : ""}</span>
                  </div>
                  {rev.feedback && (
                    <p className="mb-2 rounded bg-muted px-2 py-1.5 text-xs">
                      <span className="font-medium">Feedback that triggered this change:</span> {rev.feedback}
                    </p>
                  )}
                  <div className="space-y-2">
                    <FieldDiff name="Caption" oldValue={rev.caption ?? ""} newValue={afterCaption} />
                    <FieldDiff name="Hashtags" oldValue={hashtagsText(rev.hashtags)} newValue={afterHashtags} />
                    <FieldDiff name="CTA" oldValue={rev.cta ?? ""} newValue={afterCta} />
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
