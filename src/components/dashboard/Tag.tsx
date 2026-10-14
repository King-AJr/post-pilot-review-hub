import { cn } from "@/lib/utils";
import { label } from "@/lib/api";

const categoryTone: Record<string, string> = {
  win: "bg-tag-green text-tag-green-fg",
  build: "bg-tag-blue text-tag-blue-fg",
  why_us: "bg-tag-purple text-tag-purple-fg",
  event: "bg-tag-orange text-tag-orange-fg",
  job_posting: "bg-tag-teal text-tag-teal-fg",
  testimonial: "bg-tag-pink text-tag-pink-fg",
};

export function Tag({
  value,
  kind = "neutral",
  className,
}: {
  value?: string | null;
  kind?: "category" | "neutral" | "outline";
  className?: string;
}) {
  const tone =
    kind === "category"
      ? categoryTone[value ?? ""] ?? "bg-tag-neutral text-tag-neutral-fg"
      : kind === "outline"
        ? "border border-border text-muted-foreground"
        : "bg-tag-neutral text-tag-neutral-fg";
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide",
        tone,
        className,
      )}
    >
      {label(value)}
    </span>
  );
}
