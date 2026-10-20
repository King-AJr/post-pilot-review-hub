import { useState } from "react";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { label } from "@/lib/api";

const statusTone: Record<string, string> = {
  draft: "bg-tag-neutral text-tag-neutral-fg",
  approved: "bg-tag-green text-tag-green-fg",
  rejected: "bg-destructive/15 text-destructive",
};

export function PlatformChip({ platform, status }: { platform: string; status: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide", statusTone[status] ?? statusTone["draft"])}>
      {label(platform)}
      <span className="opacity-70">· {label(status)}</span>
    </span>
  );
}

/** Click-to-edit field; calls onSave with the new value only when it changed. */
export function EditableField({
  name,
  value,
  onSave,
  multiline,
  type = "text",
  options,
  className,
}: {
  name: string;
  value: string;
  onSave: (v: string) => Promise<unknown>;
  multiline?: boolean;
  type?: "text" | "date" | "email";
  options?: readonly string[];
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (draft === value) return setEditing(false);
    setBusy(true);
    try {
      await onSave(draft);
      toast.success(`${name} saved`);
      setEditing(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
      <p className="mb-1 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">{name}</p>
      {editing ? (
        <div className="space-y-2">
          {options ? (
            <select value={draft} onChange={(e) => setDraft(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
              {options.map((o) => <option key={o} value={o}>{label(o)}</option>)}
            </select>
          ) : multiline ? (
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={Math.min(14, Math.max(3, draft.split("\n").length + 1))} />
          ) : (
            <Input type={type} value={draft} onChange={(e) => setDraft(e.target.value)} />
          )}
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />} Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setDraft(value); setEditing(false); }} disabled={busy}>
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setDraft(value); setEditing(true); }}
          className="group flex w-full items-start gap-2 rounded-md px-2 py-1.5 -mx-2 text-left text-sm hover:bg-muted"
        >
          <span className={cn("flex-1 whitespace-pre-wrap", !value && "text-muted-foreground")}>
            {value ? (options ? label(value) : value) : "—"}
          </span>
          <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-60" />
        </button>
      )}
    </div>
  );
}
