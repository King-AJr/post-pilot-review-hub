import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, Loader2, MessageSquare, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { label } from "@/lib/api";
import {
  addPlatform, CONTENT_TYPES, deletePlatform, fetchNestedPosts, hashtagsText, PLATFORMS, reviewPlatform,
  updateCarouselPage, updatePlatform, updateThreadItem, updateVideoScene, type PlatformVariant,
} from "@/lib/nested";
import { EditableField, PlatformChip } from "@/components/dashboard/nested-ui";
import { RevisionHistory } from "@/components/dashboard/RevisionHistory";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/dashboard/States";

export const Route = createFileRoute("/posts/$postId")({
  head: () => ({
    meta: [
      { title: "Post Detail — Content Ops" },
      { name: "description", content: "Review and edit every platform version of a post idea." },
      { property: "og:title", content: "Post Detail — Content Ops" },
      { property: "og:description", content: "Review and edit every platform version of a post idea." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostDetail,
});

function PostDetail() {
  const { postId } = Route.useParams();
  const qc = useQueryClient();
  const key = ["nested-posts", postId];
  const q = useQuery({ queryKey: key, queryFn: () => fetchNestedPosts({ post_id: postId }), retry: 1 });
  const post = q.data?.find((p) => String(p.post_id) === postId) ?? q.data?.[0];
  const [tab, setTab] = useState<string>("");

  useEffect(() => {
    if (post && !post.platforms.some((v) => String(v.post_platform_id) === tab)) {
      setTab(post.platforms[0] ? String(post.platforms[0].post_platform_id) : "");
    }
  }, [post, tab]);

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["nested-posts"] });
  };

  return (
    <>
      <Link to="/posts" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> All posts
      </Link>
      {q.isPending ? (
        <LoadingState text="Loading post…" />
      ) : q.isError ? (
        <ErrorState message={q.error.message} onRetry={() => q.refetch()} />
      ) : !post ? (
        <EmptyState text="Post not found" />
      ) : (
        <>
          <PageHeader title={post.title} subtitle={post.created_at ? `Created ${post.created_at.slice(0, 10)}` : ""}>
            <Button variant="outline" size="sm" onClick={() => q.refetch()} disabled={q.isFetching}>
              <RefreshCw className={`h-3.5 w-3.5 ${q.isFetching ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </PageHeader>

          <section className="mb-6 grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-3">
            <Info name="Topic" value={post.topic} />
            <Info name="Objective" value={post.objective} />
            <Info name="Target audience" value={post.target_audience} />
            <div className="sm:col-span-3">
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">Platforms</p>
              <div className="flex flex-wrap items-center gap-1.5">
                {post.platforms.map((v) => <PlatformChip key={v.post_platform_id} platform={v.platform} status={v.status} />)}
                <AddPlatform postId={post.post_id} existing={post.platforms.map((v) => v.platform)} onDone={refresh} />
              </div>
            </div>
          </section>

          {post.platforms.length === 0 ? (
            <EmptyState text="This post has no platform versions yet" />
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="flex-wrap">
                {post.platforms.map((v) => (
                  <TabsTrigger key={v.post_platform_id} value={String(v.post_platform_id)} className="capitalize">
                    {label(v.platform)}
                  </TabsTrigger>
                ))}
              </TabsList>
              {post.platforms.map((v) => (
                <TabsContent key={v.post_platform_id} value={String(v.post_platform_id)}>
                  <VariantPanel v={v} onChange={refresh} />
                </TabsContent>
              ))}
            </Tabs>
          )}
        </>
      )}
    </>
  );
}

function Info({ name, value }: { name: string; value?: string | null | undefined }) {
  return (
    <div>
      <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{name}</p>
      <p className="whitespace-pre-wrap text-sm">{value || "—"}</p>
    </div>
  );
}

function AddPlatform({ postId, existing, onDone }: { postId: string | number; existing: string[]; onDone: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const avail = PLATFORMS.filter((p) => !existing.includes(p));
  const [platform, setPlatform] = useState<string>(avail[0] ?? PLATFORMS[0]);
  const [ct, setCt] = useState("");
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true);
    try {
      await addPlatform({ post_id: postId, platform, ...(ct && { content_type: ct }) });
      toast.success(`${label(platform)} version added`);
      setOpen(false);
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add platform");
    } finally {
      setBusy(false);
    }
  }

  if (!open)
    return (
      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => { setPlatform(avail[0] ?? PLATFORMS[0]); setOpen(true); }}>
        <Plus className="h-3 w-3" /> Add platform
      </Button>
    );
  const sel = "h-8 rounded-md border border-input bg-background px-2 text-sm";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={sel} value={platform} onChange={(e) => setPlatform(e.target.value)}>
        {PLATFORMS.map((p) => <option key={p} value={p}>{label(p)}</option>)}
      </select>
      <select className={sel} value={ct} onChange={(e) => setCt(e.target.value)}>
        <option value="">Any type (AI picks)</option>
        {CONTENT_TYPES.map((c) => <option key={c} value={c}>{label(c)}</option>)}
      </select>
      <Button size="sm" onClick={go} disabled={busy}>
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        {busy ? "Generating…" : "Add"}
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
    </div>
  );
}

function VariantPanel({ v, onChange }: { v: PlatformVariant; onChange: () => Promise<void> }) {
  const save = (field: string) => async (val: string) => {
    await updatePlatform(v.post_platform_id, { [field]: val });
    await onChange();
  };
  const pages = [...(v.carousel_pages ?? [])].sort((a, b) => a.page_number - b.page_number);
  const items = [...(v.thread_items ?? [])].sort((a, b) => a.sequence - b.sequence);
  const scenes = [...(v.video_scenes ?? [])].sort((a, b) => a.scene_number - b.scene_number);

  return (
    <div className="space-y-5 rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <PlatformChip platform={v.platform} status={v.status} />
          {!!v.revision_count && <span className="text-xs text-muted-foreground">{v.revision_count} revision{v.revision_count === 1 ? "" : "s"}</span>}
        </div>
        <RemovePlatform v={v} onDone={onChange} />
      </div>
      {v.reviewer_feedback && (
        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">Last feedback: {v.reviewer_feedback}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <EditableField name="Content type" value={v.content_type} options={CONTENT_TYPES} onSave={save("content_type")} />
        <EditableField name="Scheduled date" type="date" value={v.scheduled_date?.slice(0, 10) ?? ""} onSave={save("scheduled_date")} />
        <EditableField name="Assignee" type="email" value={v.assignee_email ?? ""} onSave={save("assignee_email")} />
        <EditableField name="Hashtags" value={hashtagsText(v.hashtags)} onSave={save("hashtags")} />
        <EditableField name="CTA" value={v.cta ?? ""} onSave={save("cta")} />
        <EditableField name="Media requirements" multiline value={v.media_requirements ?? ""} onSave={save("media_requirements")} />
      </div>

      <EditableField name="Caption" multiline value={v.caption ?? ""} onSave={save("caption")} />

      {v.content_type === "carousel" && (
        <Section title={`Carousel · ${pages.length} pages`}>
          {pages.map((pg) => {
            const s = (f: string) => async (val: string) => { await updateCarouselPage(pg.id, { [f]: val }); await onChange(); };
            return (
              <Block key={pg.id} label={`Page ${pg.page_number} / ${pg.total_pages}`}>
                <EditableField name="Heading" value={pg.heading ?? ""} onSave={s("heading")} />
                <EditableField name="Content" multiline value={pg.content ?? ""} onSave={s("content")} />
                <EditableField name="Visual notes" multiline value={pg.visual_notes ?? ""} onSave={s("visual_notes")} />
              </Block>
            );
          })}
        </Section>
      )}
      {v.content_type === "thread" && (
        <Section title={`Thread · ${items.length} items`}>
          {items.map((it) => (
            <Block key={it.id} label={`#${it.sequence}`}>
              <EditableField name="Content" multiline value={it.content ?? ""} onSave={async (val) => { await updateThreadItem(it.id, { content: val }); await onChange(); }} />
            </Block>
          ))}
        </Section>
      )}
      {v.content_type === "video" && (
        <Section title={`Video script · ${scenes.length} scenes`}>
          {scenes.map((sc) => {
            const s = (f: string) => async (val: string) => { await updateVideoScene(sc.id, { [f]: val }); await onChange(); };
            return (
              <Block key={sc.id} label={`Scene ${sc.scene_number}`}>
                <EditableField name="Dialogue / voiceover" multiline value={sc.dialogue_voiceover ?? ""} onSave={s("dialogue_voiceover")} />
                <EditableField name="On-screen text" multiline value={sc.on_screen_text ?? ""} onSave={s("on_screen_text")} />
                <EditableField name="Visual direction" multiline value={sc.visual_direction ?? ""} onSave={s("visual_direction")} />
              </Block>
            );
          })}
        </Section>
      )}

      <ReviewActions v={v} onDone={onChange} />
      <RevisionHistory variant={v} />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-wide">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}
function Block({ label: l, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-border p-4">
      <p className="mb-2 font-mono text-xs text-muted-foreground">{l}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function RemovePlatform({ v, onDone }: { v: PlatformVariant; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" disabled={busy}>
          <Trash2 className="h-3.5 w-3.5" /> Remove platform
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove the {label(v.platform)} version?</AlertDialogTitle>
          <AlertDialogDescription>This deletes its caption and all its pages, thread items or scenes. It can't be undone.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              setBusy(true);
              try {
                await deletePlatform(v.post_platform_id);
                toast.success("Platform removed");
                await onDone();
              } catch (e) {
                toast.error(e instanceof Error ? e.message : "Couldn't remove");
              } finally {
                setBusy(false);
              }
            }}
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ReviewActions({ v, onDone }: { v: PlatformVariant; onDone: () => Promise<void> }) {
  const [mode, setMode] = useState<null | "approve" | "revise" | "reject">(null);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [assignee, setAssignee] = useState(v.assignee_email ?? "");
  const [date, setDate] = useState(v.scheduled_date?.slice(0, 10) ?? "");

  async function submit() {
    if (!mode) return;
    if (mode !== "approve" && !feedback.trim()) {
      toast.error("Please add feedback");
      return;
    }
    setBusy(true);
    try {
      await reviewPlatform({
        post_platform_id: v.post_platform_id,
        action: mode,
        ...(mode === "approve"
          ? { ...(assignee.trim() && { assignee_email: assignee.trim() }), ...(date && { scheduled_date: date }) }
          : { feedback: feedback.trim() }),
      });
      toast.success(mode === "approve" ? "Approved" : mode === "revise" ? "Rewrite saved" : "Rejected");
      setMode(null);
      setFeedback("");
      await onDone();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-border pt-4">
      {mode && (
        <div className="mb-3 space-y-2">
          {mode === "approve" ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Input type="email" placeholder="Assignee email" value={assignee} onChange={(e) => setAssignee(e.target.value)} />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          ) : (
            <Textarea
              placeholder={mode === "revise" ? "What should the AI change?" : "Why is this rejected?"}
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={submit} disabled={busy} variant={mode === "reject" ? "destructive" : "default"}>
              {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {mode === "approve" ? "Confirm approve" : mode === "revise" ? (busy ? "Rewriting…" : "Send for rewrite") : "Confirm reject"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMode(null)} disabled={busy}>Cancel</Button>
          </div>
        </div>
      )}
      {!mode && (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setMode("approve")}><Check className="h-3.5 w-3.5" /> Approve</Button>
          <Button size="sm" variant="outline" onClick={() => setMode("revise")}><MessageSquare className="h-3.5 w-3.5" /> Revise</Button>
          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => setMode("reject")}><X className="h-3.5 w-3.5" /> Reject</Button>
        </div>
      )}
    </div>
  );
}
