import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BASE = "https://divverse-community.app.n8n.cloud/webhook";
const ENDPOINTS = ["content-posts", "content-review", "content-ingest"] as const;
type Endpoint = (typeof ENDPOINTS)[number];

interface ProxyInput {
  endpoint: Endpoint;
  method: "GET" | "POST";
  query?: Record<string, string>;
  body?: unknown;
}

export const n8nProxy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: ProxyInput) => {
    if (!ENDPOINTS.includes(d?.endpoint)) throw new Error("Unknown endpoint");
    if (d.method !== "GET" && d.method !== "POST") throw new Error("Bad method");
    return d;
  })
  .handler(async ({ data }) => {
    const key = process.env.N8N_API_KEY;
    if (!key) throw new Error("Server is missing N8N_API_KEY");
    const qs = data.query ? `?${new URLSearchParams(data.query).toString()}` : "";
    const res = await fetch(`${BASE}/${data.endpoint}${qs}`, {
      method: data.method,
      headers: { "Content-Type": "application/json", "x-api-key": key },
      body: data.method === "POST" ? JSON.stringify(data.body ?? {}) : undefined,
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
  });
