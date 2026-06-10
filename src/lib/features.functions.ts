// Server functions para feature flags por empresa.
// - Admin (BackOffice): liga/desliga admin_enabled.
// - Dono (painel): liga/desliga owner_enabled — só nas features liberadas pelo admin.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { FEATURE_KEYS } from "./features";

const featureKeySchema = z.string().refine((v) => (FEATURE_KEYS as string[]).includes(v), "invalid_feature");

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (error || !data) throw new Error("forbidden");
}

// ----- Admin -----
export const adminListTenantFeatures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenant_id: string }) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: rows } = await supabaseAdmin
      .from("tenant_features")
      .select("feature_key, admin_enabled, owner_enabled")
      .eq("tenant_id", data.tenant_id);
    return { features: rows ?? [] };
  });

export const adminSetTenantFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({
      tenant_id: z.string().uuid(),
      feature_key: featureKeySchema,
      enabled: z.boolean(),
    }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("set_tenant_feature_admin", {
      _tenant_id: data.tenant_id,
      _feature_key: data.feature_key,
      _enabled: data.enabled,
    } as any);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      tenant_id: data.tenant_id,
      action: data.enabled ? "feature_enabled_admin" : "feature_disabled_admin",
      details: { feature_key: data.feature_key },
    });
    return { ok: true };
  });

// ----- Owner -----
export const ownerListTenantFeatures = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { tenant_id: string }) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    // Valida que o usuário é owner desse tenant
    const { data: ok } = await context.supabase.rpc("user_has_tenant_role", {
      _user_id: context.userId,
      _tenant_id: data.tenant_id,
      _role: "owner",
    } as any);
    if (!ok) throw new Error("forbidden");
    // Retorna apenas as features liberadas pelo admin
    const { data: rows } = await supabaseAdmin
      .from("tenant_features")
      .select("feature_key, admin_enabled, owner_enabled")
      .eq("tenant_id", data.tenant_id)
      .eq("admin_enabled", true);
    return { features: rows ?? [] };
  });

export const ownerSetTenantFeature = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({
      tenant_id: z.string().uuid(),
      feature_key: featureKeySchema,
      enabled: z.boolean(),
    }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase.rpc("set_tenant_feature_owner", {
      _tenant_id: data.tenant_id,
      _feature_key: data.feature_key,
      _enabled: data.enabled,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ----- Owner: atualizar cores da própria empresa -----
export const ownerUpdateBranding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({
      tenant_id: z.string().uuid(),
      primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      primary_glow_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: ok } = await context.supabase.rpc("user_has_tenant_role", {
      _user_id: context.userId,
      _tenant_id: data.tenant_id,
      _role: "owner",
    } as any);
    if (!ok) throw new Error("forbidden");
    const { error } = await supabaseAdmin
      .from("tenants")
      .update({
        primary_color: data.primary_color,
        primary_glow_color: data.primary_glow_color,
        secondary_color: data.secondary_color,
      })
      .eq("id", data.tenant_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
