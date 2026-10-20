import { n8nProxy } from "./n8n.functions";

export type Category = "win" | "build" | "why_us" | "event" | "job_posting" | "testimonial";
export type ContentType = "image" | "short_form_video" | "marketing_video" | "carousel" | "video_script";
export type Platform = "linkedin" | "instagram" | "twitter" | "tiktok";
export type PostStatus = "draft" | "in_production" | "rejected";

export interface Post {
  id: string | number;
  post_id: string;
  title: string;
  caption: string;
  category: Category;
  content_type: ContentType;
  platform: Platform;
  status: PostStatus;
  source_id?: string | null;
  source_ref?: string | null;
  reviewer_feedback?: string | null;
  revision_count?: number | null;
  assignee_email?: string | null;
  due_date?: string | null;
  approved_at?: string | null;
  last_pinged_at?: string | null;
  ping_count?: number | null;
}

type Endpoint =
  | "content-posts"
  | "content-review"
  | "content-ingest"
  | "content-posts-nested"
  | "content-review-platform"
  | "content-platform-update"
  | "content-carousel-page-update"
  | "content-thread-item-update"
  | "content-video-scene-update"
  | "content-platform-delete"
  | "content-platform-add";

export async function request<T>(
  endpoint: Endpoint,
  opts: { method?: "GET" | "POST"; query?: Record<string, string> | undefined; body?: unknown } = {},
): Promise<T> {
  let r: { ok: boolean; status: number; text: string };
  try {
    r = await n8nProxy({ data: { endpoint, method: opts.method ?? "GET", query: opts.query, body: opts.body } });
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Couldn't reach the content server. Try again.");
  }
  let data: unknown = null;
  try {
    data = r.text ? JSON.parse(r.text) : null;
  } catch {
    data = null;
  }
  if (!r.ok) throw new Error(`Server responded with ${r.status}${r.text ? `: ${r.text.slice(0, 160)}` : ""}`);
  return data as T;
}

export async function fetchPosts(status?: PostStatus): Promise<Post[]> {
  const data = await request<{ posts?: Post[] } | Post[] | null>("content-posts", {
    query: status ? { status } : undefined,
  });
  if (Array.isArray(data)) return data;
  return data?.posts ?? [];
}

export interface ReviewBody {
  post_id: string;
  action: "approve" | "revise" | "reject";
  feedback?: string;
  assignee_email?: string | undefined;
  due_date?: string | undefined;
}
export function reviewPost(body: ReviewBody) {
  return request<{ ok: boolean; status: string }>("content-review", { method: "POST", body });
}

export interface IngestBody {
  source_type: string;
  title: string;
  content: string;
  source_ref: string;
  consent_ok: boolean;
}
export function ingestSource(body: IngestBody) {
  return request<{ ok: boolean; source_row_id: string }>("content-ingest", { method: "POST", body });
}

export const label = (s?: string | null) => (s ? s.replace(/_/g, " ") : "—");
