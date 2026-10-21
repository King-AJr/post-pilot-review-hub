import type { PlatformVariant } from "./nested";

/** Short, human-readable preview of a platform variant's actual content, for review rows. */
export function variantPreview(v: PlatformVariant): string {
  switch (v.content_type) {
    case "carousel": {
      const pages = [...(v.carousel_pages ?? [])].sort((a, b) => a.page_number - b.page_number);
      const first = pages[0];
      const n = pages.length;
      return `${n} page${n === 1 ? "" : "s"}${first?.heading ? ` — "${first.heading}"` : ""}`;
    }
    case "thread": {
      const items = [...(v.thread_items ?? [])].sort((a, b) => a.sequence - b.sequence);
      const first = items[0];
      const n = items.length;
      return `${n} post${n === 1 ? "" : "s"}${first?.content ? ` — "${first.content.slice(0, 90)}${first.content.length > 90 ? "…" : ""}"` : ""}`;
    }
    case "video": {
      const scenes = [...(v.video_scenes ?? [])].sort((a, b) => a.scene_number - b.scene_number);
      const first = scenes[0];
      const n = scenes.length;
      return `${n} scene${n === 1 ? "" : "s"}${first?.on_screen_text ? ` — "${first.on_screen_text.slice(0, 90)}"` : ""}`;
    }
    default:
      return v.caption || "—";
  }
}
