import { request } from "./api";

export const PLATFORMS = ["linkedin", "instagram", "facebook", "twitter", "tiktok"] as const;
export const CONTENT_TYPES = ["text_post", "image_post", "carousel", "thread", "video"] as const;
export type NPlatform = (typeof PLATFORMS)[number];
export type NContentType = (typeof CONTENT_TYPES)[number];
export type VariantStatus = "draft" | "approved" | "rejected";

export interface CarouselPage {
  id: string | number;
  page_number: number;
  total_pages: number;
  heading?: string | null;
  content?: string | null;
  visual_notes?: string | null;
}
export interface ThreadItem {
  id: string | number;
  sequence: number;
  content?: string | null;
}
export interface VideoScene {
  id: string | number;
  scene_number: number;
  dialogue_voiceover?: string | null;
  on_screen_text?: string | null;
  visual_direction?: string | null;
}
export interface PlatformVariant {
  post_platform_id: string | number;
  platform: NPlatform;
  content_type: NContentType;
  caption?: string | null;
  hashtags?: string | string[] | null;
  cta?: string | null;
  media_requirements?: string | null;
  status: VariantStatus;
  scheduled_date?: string | null;
  assignee_email?: string | null;
  approved_at?: string | null;
  published_at?: string | null;
  reviewer_feedback?: string | null;
  revision_count?: number | null;
  carousel_pages?: CarouselPage[] | null;
  thread_items?: ThreadItem[] | null;
  video_scenes?: VideoScene[] | null;
}
export interface NestedPost {
  post_id: string | number;
  title: string;
  topic?: string | null;
  objective?: string | null;
  target_audience?: string | null;
  created_at?: string | null;
  platforms: PlatformVariant[];
}

type Ok = { ok?: boolean };

export async function fetchNestedPosts(q?: { post_id?: string; platform?: string; platform_status?: string }) {
  const query = q ? Object.fromEntries(Object.entries(q).filter(([, v]) => v)) as Record<string, string> : undefined;
  const data = await request<{ posts?: NestedPost[] } | NestedPost[] | null>("content-posts-nested", {
    query: query && Object.keys(query).length ? query : undefined,
  });
  const posts = Array.isArray(data) ? data : (data?.posts ?? []);
  return posts.map((p) => ({ ...p, platforms: p.platforms ?? [] }));
}

export const hashtagsText = (h: PlatformVariant["hashtags"]) => (Array.isArray(h) ? h.join(" ") : (h ?? ""));

export function reviewPlatform(body: {
  post_platform_id: string | number;
  action: "approve" | "revise" | "reject";
  feedback?: string;
  assignee_email?: string;
  scheduled_date?: string;
}) {
  return request<Ok>("content-review-platform", { method: "POST", body });
}
export function updatePlatform(post_platform_id: string | number, fields: Record<string, string>) {
  return request<Ok>("content-platform-update", { method: "POST", body: { post_platform_id, fields } });
}
export function updateCarouselPage(id: string | number, fields: Record<string, string | number>) {
  return request<Ok>("content-carousel-page-update", { method: "POST", body: { id, fields } });
}
export function updateThreadItem(id: string | number, fields: Record<string, string | number>) {
  return request<Ok>("content-thread-item-update", { method: "POST", body: { id, fields } });
}
export function updateVideoScene(id: string | number, fields: Record<string, string>) {
  return request<Ok>("content-video-scene-update", { method: "POST", body: { id, fields } });
}
export function deletePlatform(post_platform_id: string | number) {
  return request<Ok>("content-platform-delete", { method: "POST", body: { post_platform_id } });
}
export function addPlatform(body: { post_id: string | number; platform: string; content_type?: string }) {
  return request<Ok>("content-platform-add", { method: "POST", body });
}
