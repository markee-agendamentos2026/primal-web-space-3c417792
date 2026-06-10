import { createFileRoute } from "@tanstack/react-router";
import { runDispatcher } from "@/lib/recurrence-dispatch.server";

// Cron-callable endpoint. Auth via Supabase anon `apikey` header (pg_cron
// sends it). Bypasses Lovable's published-site auth via /api/public/* prefix.
export const Route = createFileRoute("/api/public/hooks/recurrence-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!apikey || (expected && apikey !== expected)) {
          return new Response("unauthorized", { status: 401 });
        }
        try {
          const result = await runDispatcher();
          return Response.json({ ok: true, ...result });
        } catch (e: any) {
          console.error("recurrence-tick error", e);
          return Response.json({ ok: false, error: e?.message || "dispatcher_failed" }, { status: 500 });
        }
      },
    },
  },
});
