# Post Pilot Review Hub

Build a content operations dashboard for a social-content pipeline. It's a plain React + Tailwind frontend that talks to an existing n8n backend over HTTP — no Supabase/Lovable backend needed, no auth needed (internal tool).

Base API URL: https://divverse-community.app.n8n.cloud/webhook

Endpoints:
- GET {base}/content-posts?status=draft — returns { posts: [...] }. Also works with status=in_production, status=rejected, or no status param for all.
- POST {base}/content-review — body: { post_id, action: "approve"|"revise"|"reject", feedback?: string, assignee_email?: string, due_date?: string (YYYY-MM-DD) }. Returns { ok, status }.
- POST {base}/content-ingest — body: { source_type, title, content, source_ref, consent_ok: boolean }. Returns { ok, source_row_id }.

Post object shape: { id, post_id, title, caption, category, content_type, platform, status, source_id, source_ref, reviewer_feedback, revision_count, assignee_email, due_date, approved_at, last_pinged_at, ping_count }
- category is one of: win, build, why_us, event, job_posting, testimonial
- content_type is one of: image, short_form_video, marketing_video, carousel, video_script
- platform is one of: linkedin, instagram, twitter, tiktok
- status is one of: draft, in_production, rejected

Build three views in a tab/sidebar layout:

1. REVIEW QUEUE (default view) — fetches status=draft. Show each post as a card: title, full caption text, colored badges for category/content_type/platform, a small link to source_ref, and revision_count if > 0 (plus reviewer_feedback from the last round, shown as "previous feedback" if present). Each card has three actions: Approve, Request Changes, Reject.
   - Approve: optionally let the reviewer set assignee_email (prefill with talk2king.aj@gmail.com) and due_date before confirming, then POST action "approve" with those fields. Remove the card from the list on success (optimistic or refetch).
   - Request Changes: opens a small textarea for feedback (required, non-empty), POSTs action "revise" with that feedback. Show a loading state since this triggers an LLM rewrite server-side and may take a few seconds. Remove card from list on success (it goes back for another round, will reappear on next refresh).
   - Reject: confirm dialog, then POST action "reject" with optional feedback. Remove card from list on success.
   - Add a manual refresh button and auto-refresh every 60s.

2. PRODUCTION QUEUE — fetches status=in_production. Table or card view showing title, platform, content_type, assignee_email, due_date, ping_count. Visually flag rows where due_date is in the past (e.g. red left border or "Overdue" badge) and show ping_count if > 0 as a small badge like "2 reminders sent".

3. ADD SOURCE — a simple form to manually submit source material (used alongside the automated transcript/website ingestion already running in n8n): fields for source_type (select: engineering_meeting, training_session, hackathon, office_hours, internal_meeting, website, other), title, content (large textarea), source_ref (optional URL/reference), consent_ok (checkbox, default unchecked, with helper text "OK to use real names/quotes from this source"). POSTs to content-ingest, shows a success toast and clears the form.

Design: clean, minimal, professional internal-tool aesthetic — not salesy. Dark sidebar nav with the three sections. Category badges can be color-coded (e.g. win=green, build=blue, why_us=purple, event=orange, job_posting=teal, testimonial=pink). Handle loading and empty states ("No drafts waiting for review") and network errors gracefully with a visible error message and retry button. Since these are cross-origin requests to an n8n webhook, use fetch with mode: 'cors' and handle failures without crashing the UI.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://post-pilot-review-hub.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/7895ea60-7271-4405-84a2-3917770b6127).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
