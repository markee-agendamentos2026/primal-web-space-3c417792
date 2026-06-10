// Server functions for the Recurrence module (owner painel).
// All writes go through supabaseAdmin after asserting tenant-ownership.
//
// Channels: 'email' is dispatched via Resend (RESEND_API_KEY) if available;
// 'whatsapp' is sent via UAZAPI when app_settings has whatsapp_enabled +
// token configured. Missing infra → item marked 'skipped' with reason.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertOwner(userId: string, tenantId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("tenant_id", tenantId)
    .eq("role", "owner")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("forbidden");
}

const channelEnum = z.enum(["email", "whatsapp"]);
const audienceEnum = z.enum(["all", "active", "inactive", "manual"]);
const kindEnum = z.enum(["manual", "inactive_trigger"]);

// ---------- List ----------
export const listCampaigns = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ tenant_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.tenant_id);
    const { data: rows, error } = await supabaseAdmin
      .from("recurrence_campaigns")
      .select("*")
      .eq("tenant_id", data.tenant_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { campaigns: rows ?? [] };
  });

// ---------- Upsert ----------
export const upsertCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid().optional(),
      tenant_id: z.string().uuid(),
      name: z.string().trim().min(1).max(120),
      kind: kindEnum,
      channels: z.array(channelEnum).min(1),
      audience_mode: audienceEnum,
      inactive_days: z.number().int().min(1).max(365),
      message_body: z.string().min(1).max(4000),
      email_subject: z.string().trim().max(200).nullable().optional(),
      active: z.boolean(),
      target_profile_ids: z.array(z.string().uuid()).max(2000).optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.tenant_id);

    const row: any = {
      tenant_id: data.tenant_id,
      name: data.name,
      kind: data.kind,
      channels: data.channels,
      audience_mode: data.kind === "inactive_trigger" ? "inactive" : data.audience_mode,
      inactive_days: data.inactive_days,
      message_body: data.message_body,
      email_subject: data.email_subject ?? null,
      active: data.active,
    };

    let campaignId = data.id;
    if (campaignId) {
      const { error } = await supabaseAdmin.from("recurrence_campaigns").update(row).eq("id", campaignId);
      if (error) throw new Error(error.message);
    } else {
      row.created_by = context.userId;
      const { data: ins, error } = await supabaseAdmin
        .from("recurrence_campaigns").insert(row).select("id").single();
      if (error) throw new Error(error.message);
      campaignId = ins.id;
    }

    // Sync manual targets
    if (data.audience_mode === "manual" && data.kind === "manual") {
      await supabaseAdmin.from("recurrence_campaign_targets").delete().eq("campaign_id", campaignId!);
      if (data.target_profile_ids && data.target_profile_ids.length) {
        const rows = data.target_profile_ids.map((pid) => ({ campaign_id: campaignId!, profile_id: pid }));
        const { error } = await supabaseAdmin.from("recurrence_campaign_targets").insert(rows);
        if (error) throw new Error(error.message);
      }
    }

    return { id: campaignId };
  });

// ---------- Delete ----------
export const deleteCampaign = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), tenant_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.tenant_id);
    const { error } = await supabaseAdmin
      .from("recurrence_campaigns").delete().eq("id", data.id).eq("tenant_id", data.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ---------- Resolve audience profiles ----------
async function resolveAudience(tenantId: string, campaign: any): Promise<{ id: string; name: string | null; whatsapp: string | null; email: string | null }[]> {
  if (campaign.audience_mode === "manual") {
    const { data, error } = await supabaseAdmin
      .from("recurrence_campaign_targets")
      .select("profile_id")
      .eq("campaign_id", campaign.id);
    if (error) throw new Error(error.message);
    const ids = (data ?? []).map((r: any) => r.profile_id);
    if (!ids.length) return [];
    const { data: profs, error: pErr } = await supabaseAdmin
      .from("profiles").select("id,name,whatsapp,email").in("id", ids);
    if (pErr) throw new Error(pErr.message);
    return (profs as any) ?? [];
  }
  if (campaign.audience_mode === "inactive") {
    const { data, error } = await supabaseAdmin.rpc("recurrence_eligible_inactive_clients", {
      _tenant_id: tenantId, _days: campaign.inactive_days,
    });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({ id: r.profile_id, name: r.name, whatsapp: r.whatsapp, email: r.email }));
  }
  // 'all' or 'active'
  const q = supabaseAdmin.from("profiles").select("id,name,whatsapp,email").eq("tenant_id", tenantId);
  if (campaign.audience_mode === "active") q.eq("active", true);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data as any) ?? [];
}

// Insert queue rows for a campaign (used by run-now and by the cron dispatcher).
// Returns counts. For inactive_trigger we rely on the unique parcial index to
// avoid duplicates; manual runs use a fresh queue row each time (which the
// index also tolerates because manual runs never collide with itself once sent).
export async function enqueueCampaign(tenantId: string, campaignId: string) {
  const { data: campaign, error: cErr } = await supabaseAdmin
    .from("recurrence_campaigns").select("*").eq("id", campaignId).eq("tenant_id", tenantId).maybeSingle();
  if (cErr) throw new Error(cErr.message);
  if (!campaign) throw new Error("Campanha não encontrada.");
  if (!campaign.active) return { enqueued: 0, skipped_duplicates: 0 };

  const audience = await resolveAudience(tenantId, campaign);
  if (!audience.length) {
    await supabaseAdmin.from("recurrence_campaigns").update({ last_run_at: new Date().toISOString() }).eq("id", campaignId);
    return { enqueued: 0, skipped_duplicates: 0 };
  }

  const rows: any[] = [];
  for (const p of audience) {
    for (const ch of campaign.channels as string[]) {
      if (ch === "email" && !p.email) continue;
      if (ch === "whatsapp" && !p.whatsapp) continue;
      rows.push({
        tenant_id: tenantId,
        campaign_id: campaignId,
        profile_id: p.id,
        channel: ch,
        status: "queued",
        payload_snapshot: {
          name: p.name, email: p.email, whatsapp: p.whatsapp,
          message: campaign.message_body, subject: campaign.email_subject,
        },
      });
    }
  }
  if (!rows.length) {
    await supabaseAdmin.from("recurrence_campaigns").update({ last_run_at: new Date().toISOString() }).eq("id", campaignId);
    return { enqueued: 0, skipped_duplicates: 0 };
  }
  // Bulk insert; ignore unique-index conflicts (dedupe for triggered campaigns)
  const { data: ins, error: iErr } = await supabaseAdmin
    .from("recurrence_queue")
    .upsert(rows, { onConflict: "campaign_id,profile_id,channel", ignoreDuplicates: true })
    .select("id");
  if (iErr) throw new Error(iErr.message);
  await supabaseAdmin.from("recurrence_campaigns").update({ last_run_at: new Date().toISOString() }).eq("id", campaignId);
  return { enqueued: ins?.length ?? 0, skipped_duplicates: rows.length - (ins?.length ?? 0) };
}

// ---------- Run now (manual trigger) ----------
export const runCampaignNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid(), tenant_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.tenant_id);
    const r = await enqueueCampaign(data.tenant_id, data.id);
    return r;
  });

// ---------- Read queue / log ----------
export const listQueue = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ tenant_id: z.string().uuid(), limit: z.number().int().min(1).max(200).default(50) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.tenant_id);
    const { data: rows, error } = await supabaseAdmin
      .from("recurrence_queue").select("*")
      .eq("tenant_id", data.tenant_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { queue: rows ?? [] };
  });

export const listLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ tenant_id: z.string().uuid(), limit: z.number().int().min(1).max(200).default(50) }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.tenant_id);
    const { data: rows, error } = await supabaseAdmin
      .from("recurrence_send_log").select("*")
      .eq("tenant_id", data.tenant_id)
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return { log: rows ?? [] };
  });

// ---------- Tenant comm settings ----------
export const updateTenantComm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      tenant_id: z.string().uuid(),
      whatsapp_sender_number: z.string().trim().max(32).nullable().optional(),
      email_reply_to: z.string().trim().email().max(255).nullable().optional(),
      whatsapp_instance: z.string().trim().max(120).nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.tenant_id);
    const upd: any = {};
    if (data.whatsapp_sender_number !== undefined) upd.whatsapp_sender_number = data.whatsapp_sender_number || null;
    if (data.email_reply_to !== undefined) upd.email_reply_to = data.email_reply_to || null;
    if (data.whatsapp_instance !== undefined) upd.whatsapp_instance = data.whatsapp_instance || null;
    if (Object.keys(upd).length) {
      const { error } = await supabaseAdmin.from("tenants").update(upd).eq("id", data.tenant_id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const getTenantComm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ tenant_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.tenant_id);
    const { data: t, error } = await supabaseAdmin
      .from("tenants").select("whatsapp_sender_number,email_reply_to,whatsapp_instance,name")
      .eq("id", data.tenant_id).maybeSingle();
    if (error) throw new Error(error.message);
    return { tenant: t };
  });

// ---------- Helper for clientes (manual audience picker) ----------
export const listProfilesForPicker = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ tenant_id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertOwner(context.userId, data.tenant_id);
    const { data: rows, error } = await supabaseAdmin
      .from("profiles").select("id,name,email,whatsapp,active")
      .eq("tenant_id", data.tenant_id)
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { profiles: rows ?? [] };
  });
