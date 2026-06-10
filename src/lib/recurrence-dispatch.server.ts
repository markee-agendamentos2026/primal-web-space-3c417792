// Server-only dispatcher used by the cron tick route. Reads queued items,
// respects min interval between sends, calls Resend (e-mail) and UAZAPI
// (WhatsApp) when configured, marks skipped/failed otherwise.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { enqueueCampaign } from "./recurrence.functions";

type Settings = {
  uazapi_base_url: string | null;
  email_from_name: string;
  email_from_local: string;
  recurrence_min_interval_seconds: number;
  recurrence_batch_size: number;
};

function renderTemplate(tpl: string, vars: Record<string, string | null | undefined>) {
  return tpl.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] ?? "").toString());
}

async function sendEmail(opts: {
  fromName: string; fromLocal: string; replyTo: string | null;
  to: string; subject: string; html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY ausente (configure integração de e-mail)" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: `${opts.fromName} <${opts.fromLocal}@markee.app>`,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        reply_to: opts.replyTo || undefined,
      }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: `resend_${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "resend_fetch_failed" };
  }
}

async function sendWhatsApp(opts: {
  baseUrl: string; token: string; instance: string | null; to: string; text: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const url = `${opts.baseUrl.replace(/\/$/, "")}/send/text`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: opts.token },
      body: JSON.stringify({ number: opts.to, text: opts.text, instance: opts.instance || undefined }),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: `uazapi_${res.status}: ${t.slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "uazapi_fetch_failed" };
  }
}

export async function runDispatcher() {
  // 1) Load global settings — apenas URL base e ajustes de fila/e-mail.
  //    Token e toggle de WhatsApp são por empresa (tenants.uazapi_token / tenants.whatsapp_enabled).
  const { data: s, error: sErr } = await supabaseAdmin
    .from("app_settings")
    .select("uazapi_base_url,email_from_name,email_from_local,recurrence_min_interval_seconds,recurrence_batch_size")
    .eq("id", true).maybeSingle();
  if (sErr) throw new Error(sErr.message);
  const settings: Settings = (s as any) ?? {
    uazapi_base_url: null,
    email_from_name: "Markee", email_from_local: "contato",
    recurrence_min_interval_seconds: 60, recurrence_batch_size: 50,
  };

  // 2) Enqueue active inactive_trigger campaigns (1x per day per item via unique index)
  const { data: triggers } = await supabaseAdmin
    .from("recurrence_campaigns")
    .select("id,tenant_id")
    .eq("kind", "inactive_trigger")
    .eq("active", true);
  const enqResults: any[] = [];
  for (const c of (triggers ?? []) as any[]) {
    try {
      const r = await enqueueCampaign(c.tenant_id, c.id);
      enqResults.push({ campaign_id: c.id, ...r });
    } catch (e: any) {
      enqResults.push({ campaign_id: c.id, error: e?.message });
    }
  }

  // 3) Pull a batch of queued items, oldest first
  const { data: queue, error: qErr } = await supabaseAdmin
    .from("recurrence_queue")
    .select("*")
    .eq("status", "queued")
    .lte("scheduled_for", new Date().toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(settings.recurrence_batch_size);
  if (qErr) throw new Error(qErr.message);

  const minMs = Math.max(0, settings.recurrence_min_interval_seconds * 1000);
  type TenantCtx = { email_reply_to: string | null; whatsapp_instance: string | null; whatsapp_sender_number: string | null; name: string; uazapi_token: string | null; whatsapp_enabled: boolean };
  const tenantCache = new Map<string, TenantCtx>();
  const results: any[] = [];

  for (const item of (queue ?? []) as any[]) {
    // load tenant comm context once per tenant (token + toggle são per-tenant)
    let tCtx = tenantCache.get(item.tenant_id);
    if (!tCtx) {
      const { data: t } = await supabaseAdmin
        .from("tenants")
        .select("email_reply_to,whatsapp_instance,whatsapp_sender_number,name,uazapi_token,whatsapp_enabled")
        .eq("id", item.tenant_id).maybeSingle();
      tCtx = ((t as any) ?? { email_reply_to: null, whatsapp_instance: null, whatsapp_sender_number: null, name: "Estabelecimento", uazapi_token: null, whatsapp_enabled: false }) as TenantCtx;
      tenantCache.set(item.tenant_id, tCtx);
    }
    const ctx = tCtx;

    const snap = (item.payload_snapshot ?? {}) as any;
    const vars = { name: snap.name || "Cliente", business: ctx.name };
    const message = renderTemplate(snap.message ?? "", vars);
    const subject = renderTemplate(snap.subject || `Olá de ${ctx.name}`, vars);

    let outcome: { ok: boolean; status: "sent" | "failed" | "skipped"; error?: string };

    if (item.channel === "email") {
      if (!snap.email) {
        outcome = { ok: false, status: "skipped", error: "cliente sem e-mail" };
      } else {
        const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111">${message.replace(/\n/g, "<br/>")}</div>`;
        const r = await sendEmail({
          fromName: settings.email_from_name, fromLocal: settings.email_from_local,
          replyTo: ctx.email_reply_to, to: snap.email, subject, html,
        });
        outcome = r.ok ? { ok: true, status: "sent" } : { ok: false, status: "failed", error: r.error };
      }
    } else if (item.channel === "whatsapp") {
      if (!ctx.whatsapp_enabled || !ctx.uazapi_token || !settings.uazapi_base_url) {
        outcome = { ok: false, status: "skipped", error: "aguardando integração WhatsApp" };
      } else if (!snap.whatsapp) {
        outcome = { ok: false, status: "skipped", error: "cliente sem WhatsApp" };
      } else {
        const r = await sendWhatsApp({
          baseUrl: settings.uazapi_base_url, token: ctx.uazapi_token,
          instance: ctx.whatsapp_instance, to: snap.whatsapp, text: message,
        });
        outcome = r.ok ? { ok: true, status: "sent" } : { ok: false, status: "failed", error: r.error };
      }
    } else {
      outcome = { ok: false, status: "skipped", error: "canal desconhecido" };
    }

    const nextAttempts = (item.attempts ?? 0) + 1;
    const finalStatus =
      outcome.status === "sent" ? "sent" :
      outcome.status === "skipped" ? "skipped" :
      nextAttempts >= 3 ? "failed" : "queued";

    await supabaseAdmin.from("recurrence_queue").update({
      status: finalStatus,
      attempts: nextAttempts,
      sent_at: outcome.status === "sent" ? new Date().toISOString() : item.sent_at,
      error: outcome.error ?? null,
      scheduled_for: finalStatus === "queued"
        ? new Date(Date.now() + 5 * 60 * 1000).toISOString()
        : item.scheduled_for,
    }).eq("id", item.id);

    await supabaseAdmin.from("recurrence_send_log").insert({
      tenant_id: item.tenant_id,
      campaign_id: item.campaign_id,
      profile_id: item.profile_id,
      channel: item.channel,
      status: outcome.status,
      recipient: item.channel === "email" ? snap.email : snap.whatsapp,
      message_preview: message.slice(0, 280),
      error: outcome.error ?? null,
    });

    results.push({ id: item.id, channel: item.channel, status: outcome.status });

    if (minMs > 0 && (queue?.length ?? 0) > 1) {
      await new Promise((r) => setTimeout(r, minMs));
    }
  }

  return { enqueue: enqResults, dispatched: results.length, results };
}
