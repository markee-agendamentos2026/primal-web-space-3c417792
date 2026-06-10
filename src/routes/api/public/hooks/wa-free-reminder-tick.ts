// Cron-callable: gera lembretes WhatsApp Gratuito (wa.me) para bookings
// que vão acontecer em ~N minutos. Marca booking.wa_free_reminder_sent_at
// e registra em recurrence_send_log (canal "whatsapp_free") com o link
// pronto, para o dono clicar a partir do painel.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/wa-free-reminder-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const expected = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (!apikey || (expected && apikey !== expected)) {
          return new Response("unauthorized", { status: 401 });
        }
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { renderWaTemplate, waMeLink } = await import("@/lib/wa-free");

          // 1. Pega tenants com WhatsApp gratuito ativo (admin + owner + flag)
          const { data: feats } = await supabaseAdmin
            .from("tenant_features")
            .select("tenant_id, admin_enabled, owner_enabled")
            .eq("feature_key", "flow.wa_free")
            .eq("admin_enabled", true)
            .eq("owner_enabled", true);

          const tenantIds = (feats ?? []).map((f) => f.tenant_id);
          if (tenantIds.length === 0) return Response.json({ ok: true, processed: 0 });

          const { data: tenants } = await supabaseAdmin
            .from("tenants")
            .select("id, name, wa_free_enabled, wa_free_reminder_template, wa_free_reminder_minutes_before")
            .in("id", tenantIds)
            .eq("wa_free_enabled", true);

          let processed = 0;
          const now = new Date();
          // Janela: 2 minutos (tick a cada minuto + tolerância)
          for (const t of tenants ?? []) {
            const minsBefore = t.wa_free_reminder_minutes_before ?? 40;
            const targetMs = now.getTime() + minsBefore * 60_000;
            const lo = new Date(targetMs - 60_000);
            const hi = new Date(targetMs + 60_000);

            // Trabalhamos em horário local (America/Sao_Paulo). bookings.date e
            // bookings.time são local. Para simplificar, montamos o timestamp
            // local do booking e comparamos com 'now' local também.
            // SP é UTC-3 sem horário de verão atualmente.
            const SP_OFFSET_MIN = -180; // -3h
            const toLocal = (d: Date) => new Date(d.getTime() + (d.getTimezoneOffset() - SP_OFFSET_MIN) * 60_000);
            const loLocal = toLocal(lo);
            const hiLocal = toLocal(hi);
            // Mesmo dia (assumimos janela curta)
            const dateStr = loLocal.toISOString().slice(0, 10);
            const loTime = loLocal.toISOString().slice(11, 19);
            const hiTime = hiLocal.toISOString().slice(11, 19);

            const { data: bookings } = await supabaseAdmin
              .from("bookings")
              .select("id, client_name, whatsapp, service_name, professional_name, date, time")
              .eq("tenant_id", t.id)
              .eq("status", "confirmed")
              .eq("date", dateStr)
              .gte("time", loTime)
              .lte("time", hiTime)
              .is("wa_free_reminder_sent_at", null);

            for (const b of bookings ?? []) {
              const msg = renderWaTemplate(t.wa_free_reminder_template, {
                cliente: b.client_name, servico: b.service_name,
                data: b.date, hora: b.time,
                profissional: b.professional_name, negocio: t.name,
              });
              const link = waMeLink(b.whatsapp, msg);

              await supabaseAdmin.from("recurrence_send_log").insert({
                tenant_id: t.id, channel: "whatsapp_free",
                recipient: b.whatsapp, message_preview: link,
                status: "queued", error: null,
              });
              await supabaseAdmin
                .from("bookings")
                .update({ wa_free_reminder_sent_at: new Date().toISOString() })
                .eq("id", b.id);
              processed++;
            }
          }
          return Response.json({ ok: true, processed });
        } catch (e: any) {
          console.error("wa-free-reminder-tick error", e);
          return Response.json({ ok: false, error: e?.message || "tick_failed" }, { status: 500 });
        }
      },
    },
  },
});
