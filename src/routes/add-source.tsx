import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ingestSource, label } from "@/lib/api";
import { PageHeader } from "@/components/dashboard/States";

export const Route = createFileRoute("/add-source")({
  head: () => ({
    meta: [
      { title: "Add Source — Content Ops" },
      { name: "description", content: "Manually submit source material into the content pipeline." },
      { property: "og:title", content: "Add Source — Content Ops" },
      { property: "og:description", content: "Manually submit source material into the content pipeline." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AddSource,
});

const TYPES = ["engineering_meeting", "training_session", "hackathon", "office_hours", "internal_meeting", "website", "other"];
const empty = { source_type: "", title: "", content: "", source_ref: "", consent_ok: false };

function AddSource() {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = form.source_type && form.title.trim() && form.content.trim();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const r = await ingestSource({ ...form, title: form.title.trim(), source_ref: form.source_ref.trim() });
      toast.success("Source submitted", { description: r?.source_row_id ? `Row ${r.source_row_id}` : undefined });
      setForm(empty);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Add Source" subtitle="Manually feed material into the pipeline, alongside automated transcript and website ingestion." />
      <form onSubmit={onSubmit} className="max-w-2xl space-y-5 rounded-lg border border-border bg-card p-6">
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Source type</Label>
            <Select value={form.source_type} onValueChange={(v) => setForm({ ...form, source_type: v })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="capitalize">{label(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Q4 hackathon demo day" />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="content">Content</Label>
          <Textarea id="content" rows={12} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Paste transcript, notes or page text…" className="font-mono text-xs leading-relaxed" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="ref">Source reference <span className="font-normal text-muted-foreground">(optional)</span></Label>
          <Input id="ref" value={form.source_ref} onChange={(e) => setForm({ ...form, source_ref: e.target.value })} placeholder="https://… or doc ID" />
        </div>
        <label className="flex items-start gap-3 rounded-md bg-muted p-3">
          <Checkbox checked={form.consent_ok} onCheckedChange={(c) => setForm({ ...form, consent_ok: c === true })} className="mt-0.5" />
          <span>
            <span className="text-sm font-medium">Consent given</span>
            <span className="block text-xs text-muted-foreground">OK to use real names/quotes from this source</span>
          </span>
        </label>
        {error && <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={!valid || busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit source
        </Button>
      </form>
    </>
  );
}
