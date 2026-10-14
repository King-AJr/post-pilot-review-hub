export const API_BASE = "https://divverse-community.app.n8n.cloud/webhook";

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

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      mode: "cors",
      ...init,
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
  } catch {
    throw new Error("Couldn't reach the content server. Check your connection and try again.");
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    throw new Error(`Server responded with ${res.status}${text ? `: ${text.slice(0, 160)}` : ""}`);
  }
  return data as T;
}

export async function fetchPosts(status?: PostStatus): Promise<Post[]> {
  const q = status ? `?status=${status}` : "";
  const data = await request<{ posts?: Post[] } | Post[] | null>(`/content-posts${q}`);
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
  return request<{ ok: boolean; status: string }>("/content-review", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export interface IngestBody {
  source_type: string;
  title: string;
  content: string;
  source_ref: string;
  consent_ok: boolean;
}
export function ingestSource(body: IngestBody) {
  return request<{ ok: boolean; source_row_id: string }>("/content-ingest", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export const label = (s?: string | null) => (s ? s.replace(/_/g, " ") : "—");
