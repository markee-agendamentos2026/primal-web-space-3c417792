// Server functions para o WhatsApp Gratuito (link wa.me, sem API paga).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ----- Config pública por tenant (lida pelo fluxo de agendamento) -----
export const getWaFreePublicConfig = createServerFn({ method: "GET" })
  .inputValidator((d: { tenant_id: string }) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: t }, { data: feat }] = await Promise.all([
      supabaseAdmin
        .from("tenants")
        .select("id, name, owner_phone, wa_free_enabled, wa_free_confirm_template, wa_free_reminder_template, wa_free_reminder_minutes_before")
        .eq("id", data.tenant_id)
        .maybeSingle(),
      supabaseAdmin
        .from("tenant_features")
        .select("admin_enabled, owner_enabled")
        .eq("tenant_id", data.tenant_id)
        .eq("feature_key", "flow.wa_free")
        .maybeSingle(),
    ]);
    const adminOk = !!feat?.admin_enabled;
    const ownerOk = !!feat?.owner_enabled;
    const enabled = adminOk && ownerOk && !!t?.wa_free_enabled;
    return {
      enabled,
      feature_admin_enabled: adminOk,
      tenant: t ?? null,
    };
  });

// ----- Owner: ler e atualizar a config -----
export const ownerGetWaFreeConfig = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenant_id: string }) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: ok } = await context.supabase.rpc("user_has_tenant_role", {
      _user_id: context.userId, _tenant_id: data.tenant_id, _role: "owner",
    } as any);
    if (!ok) throw new Error("forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: t }, { data: feat }] = await Promise.all([
      supabaseAdmin
        .from("tenants")
        .select("wa_free_enabled, wa_free_confirm_template, wa_free_reminder_template, wa_free_reminder_minutes_before, owner_phone")
        .eq("id", data.tenant_id)
        .maybeSingle(),
      supabaseAdmin
        .from("tenant_features")
        .select("admin_enabled")
        .eq("tenant_id", data.tenant_id)
        .eq("feature_key", "flow.wa_free")
        .maybeSingle(),
    ]);
    return {
      config: t ?? null,
      feature_admin_enabled: !!feat?.admin_enabled,
    };
  });

export const ownerUpdateWaFreeConfig = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    tenant_id: z.string().uuid(),
    wa_free_enabled: z.boolean(),
    wa_free_confirm_template: z.string().min(1).max(2000),
    wa_free_reminder_template: z.string().min(1).max(2000),
    wa_free_reminder_minutes_before: z.number().int().min(5).max(1440),
    owner_phone: z.string().min(8).max(20).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: ok } = await context.supabase.rpc("user_has_tenant_role", {
      _user_id: context.userId, _tenant_id: data.tenant_id, _role: "owner",
    } as any);
    if (!ok) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Se está tentando ativar, verifica se admin liberou a feature
    if (data.wa_free_enabled) {
      const { data: feat } = await supabaseAdmin
        .from("tenant_features")
        .select("admin_enabled")
        .eq("tenant_id", data.tenant_id)
        .eq("feature_key", "flow.wa_free")
        .maybeSingle();
      if (!feat?.admin_enabled) throw new Error("feature_not_available");

      // Marca owner_enabled = true via RPC (já segura)
      await context.supabase.rpc("set_tenant_feature_owner", {
        _tenant_id: data.tenant_id, _feature_key: "flow.wa_free", _enabled: true,
      } as any);
    } else {
      await context.supabase.rpc("set_tenant_feature_owner", {
        _tenant_id: data.tenant_id, _feature_key: "flow.wa_free", _enabled: false,
      } as any);
    }

    const updatePayload: any = {
      wa_free_enabled: data.wa_free_enabled,
      wa_free_confirm_template: data.wa_free_confirm_template,
      wa_free_reminder_template: data.wa_free_reminder_template,
      wa_free_reminder_minutes_before: data.wa_free_reminder_minutes_before,
    };
    if (typeof data.owner_phone === "string") {
      updatePayload.owner_phone = data.owner_phone.replace(/\D/g, "");
    }
    const { error } = await supabaseAdmin
      .from("tenants")
      .update(updatePayload)
      .eq("id", data.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- Owner: listar lembretes pendentes (gerados pelo cron) -----
export const ownerListWaFreeReminders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenant_id: string }) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: ok } = await context.supabase.rpc("user_has_tenant_role", {
      _user_id: context.userId, _tenant_id: data.tenant_id, _role: "owner",
    } as any);
    if (!ok) throw new Error("forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("recurrence_send_log")
      .select("id, channel, recipient, message_preview, created_at, status, error")
      .eq("tenant_id", data.tenant_id)
      .eq("channel", "whatsapp_free")
      .order("created_at", { ascending: false })
      .limit(50);
    return { reminders: rows ?? [] };
  });
