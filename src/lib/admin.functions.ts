// Server functions for the BackOffice (/admin).
// Each fn verifies admin role server-side via is_admin() RPC, then uses
// supabaseAdmin for cross-tenant access (bypasses RLS safely).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { formatInvalidApiKeyHint } from "@/lib/supabase-service-role";

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("is_admin", { _user_id: ctx.userId });
  if (error || !data) throw new Error("forbidden");
}

// Chama a API admin do GoTrue por fetch direto — o SDK em alguns casos
// retorna 200 sem persistir a mudança de e-mail. Fetch direto é determinístico.
async function adminAuthFetch(path: string, init: { method: "POST" | "PUT" | "GET" | "DELETE"; body?: any }) {
  const url = `${process.env.SUPABASE_URL}/auth/v1/admin/${path}`;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const res = await fetch(url, {
    method: init.method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const raw = json?.msg || json?.error_description || json?.error || `auth_admin_${res.status}`;
    const msg =
      /invalid api key/i.test(String(raw)) && process.env.SUPABASE_URL
        ? formatInvalidApiKeyHint(process.env.SUPABASE_URL)
        : String(raw);
    throw new Error(msg);
  }
  return json;
}


// ---------- Dashboard ----------
export const adminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    await supabaseAdmin.rpc("refresh_all_tenant_statuses");

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5); sixMonthsAgo.setDate(1);

    const [tenantsRes, paymentsMonthRes, bookingsTodayRes, allTenantsForChartRes, paymentsForChartRes, bookingsChartRes, rolesRes] =
      await Promise.all([
        supabaseAdmin.from("tenants").select("id, status, created_at, monthly_price"),
        supabaseAdmin.from("payments").select("amount, paid_at").gte("paid_at", monthStart.toISOString()),
        supabaseAdmin.from("bookings").select("id", { count: "exact", head: true }).gte("date", todayStart.toISOString().slice(0, 10)),
        supabaseAdmin.from("tenants").select("created_at"),
        supabaseAdmin.from("payments").select("amount, paid_at").gte("paid_at", sixMonthsAgo.toISOString()),
        supabaseAdmin.from("bookings").select("date").gte("date", sixMonthsAgo.toISOString().slice(0, 10)),
        supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }),
      ]);

    const tenants = tenantsRes.data ?? [];
    const active = tenants.filter((t: any) => t.status === "active").length;
    const late = tenants.filter((t: any) => t.status === "late").length;
    const blocked = tenants.filter((t: any) => t.status === "blocked").length;
    const total = tenants.length;
    const newThisMonth = tenants.filter((t: any) => new Date(t.created_at) >= monthStart).length;
    const revenueMonth = (paymentsMonthRes.data ?? []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

    // Monthly buckets for last 6 months
    const months: { key: string; label: string }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
      months.push({ key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, label: d.toLocaleDateString("pt-BR", { month: "short" }) });
    }
    const bucket = (date: string) => {
      const d = new Date(date); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    };
    const empresasChart = months.map((m) => ({
      mes: m.label,
      total: (allTenantsForChartRes.data ?? []).filter((t: any) => bucket(t.created_at) === m.key).length,
    }));
    const receitaChart = months.map((m) => ({
      mes: m.label,
      receita: (paymentsForChartRes.data ?? [])
        .filter((p: any) => bucket(p.paid_at) === m.key)
        .reduce((s: number, p: any) => s + Number(p.amount || 0), 0),
    }));
    const agendaChart = months.map((m) => ({
      mes: m.label,
      agendamentos: (bookingsChartRes.data ?? []).filter((b: any) => bucket(b.date) === m.key).length,
    }));

    return {
      kpis: {
        active, late, blocked, total, newThisMonth,
        revenueMonth,
        bookingsToday: bookingsTodayRes.count ?? 0,
        activeUsers: rolesRes.count ?? 0,
      },
      charts: { empresas: empresasChart, receita: receitaChart, agenda: agendaChart },
    };
  });

// ---------- Tenants ----------
export const adminListTenants = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    await supabaseAdmin.rpc("refresh_all_tenant_statuses");
    const { data: tenants } = await supabaseAdmin
      .from("tenants").select("*").order("created_at", { ascending: false });
    // Aggregate per tenant: users + bookings count, last payment
    const ids = (tenants ?? []).map((t: any) => t.id);
    if (ids.length === 0) return { tenants: [] };
    const [usersAgg, bookingsAgg, lastPays] = await Promise.all([
      supabaseAdmin.from("user_roles").select("tenant_id").in("tenant_id", ids),
      supabaseAdmin.from("bookings").select("tenant_id").in("tenant_id", ids),
      supabaseAdmin.from("payments").select("tenant_id, paid_at").in("tenant_id", ids).order("paid_at", { ascending: false }),
    ]);
    const usersByTenant = new Map<string, number>();
    (usersAgg.data ?? []).forEach((r: any) => usersByTenant.set(r.tenant_id, (usersByTenant.get(r.tenant_id) ?? 0) + 1));
    const bookingsByTenant = new Map<string, number>();
    (bookingsAgg.data ?? []).forEach((r: any) => bookingsByTenant.set(r.tenant_id, (bookingsByTenant.get(r.tenant_id) ?? 0) + 1));
    const lastPayByTenant = new Map<string, string>();
    (lastPays.data ?? []).forEach((r: any) => { if (!lastPayByTenant.has(r.tenant_id)) lastPayByTenant.set(r.tenant_id, r.paid_at); });

    return {
      tenants: (tenants ?? []).map((t: any) => ({
        ...t,
        users_count: usersByTenant.get(t.id) ?? 0,
        bookings_count: bookingsByTenant.get(t.id) ?? 0,
        last_payment_at: t.last_payment_at ?? lastPayByTenant.get(t.id) ?? null,
      })),
    };
  });

export const adminGetTenant = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const [{ data: tenant }, { data: payments }, { data: audit }] = await Promise.all([
      supabaseAdmin.from("tenants").select("*").eq("id", data.id).maybeSingle(),
      supabaseAdmin.from("payments").select("*").eq("tenant_id", data.id).order("paid_at", { ascending: false }),
      supabaseAdmin.from("audit_logs").select("*").eq("tenant_id", data.id).order("created_at", { ascending: false }).limit(50),
    ]);
    return { tenant, payments: payments ?? [], audit: audit ?? [] };
  });

export const adminUpdateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({
      id: z.string().uuid(),
      name: z.string().min(1).optional(),
      slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "slug inválido (use apenas letras minúsculas, números e hífen)").optional(),
      owner_name: z.string().nullable().optional(),
      owner_phone: z.string().nullable().optional(),
      owner_email: z.string().nullable().optional(),
      monthly_price: z.number().min(0).optional(),
      due_date: z.string().nullable().optional(),
      blocked_grace_days: z.number().min(0).max(60).optional(),
      // WhatsApp (per-tenant) — admin only
      uazapi_token: z.string().max(500).nullable().optional(),
      whatsapp_enabled: z.boolean().optional(),
      whatsapp_instance: z.string().max(120).nullable().optional(),
      whatsapp_sender_number: z.string().max(32).nullable().optional(),
      // Branding — cores aplicadas no site público / painel da empresa
      primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
      primary_glow_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
      secondary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
    }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { id, ...patch } = data;

    // Se o slug mudou, verifica unicidade — todas as referências internas
    // são por tenant_id (UUID), portanto trocar o slug só muda a URL pública
    // sem perder agendamentos, profissionais, profiles, etc.
    if (typeof patch.slug === "string" && patch.slug.length > 0) {
      const { data: clash } = await supabaseAdmin
        .from("tenants").select("id").eq("slug", patch.slug).neq("id", id).maybeSingle();
      if (clash) throw new Error("slug_in_use");
    }

    // Se o e-mail do dono mudou, sincroniza com auth.users e profiles
    if (typeof patch.owner_email === "string" && patch.owner_email.length > 0) {
      const { data: roles } = await supabaseAdmin
        .from("user_roles").select("user_id").eq("tenant_id", id).eq("role", "owner").limit(1);
      if (roles && roles.length > 0) {
        const uid = roles[0].user_id;
        try {
          await adminAuthFetch(`users/${uid}`, {
            method: "PUT",
            body: { email: patch.owner_email, email_confirm: true },
          });
        } catch (e: any) {
          if (/already|exists|registered|duplicate/i.test(e?.message ?? "")) throw new Error("email_in_use");
          throw e;
        }
        // Verifica que persistiu
        const verify = await adminAuthFetch(`users/${uid}`, { method: "GET" });
        if ((verify?.email ?? "").toLowerCase() !== patch.owner_email.toLowerCase()) {
          throw new Error("email_update_not_persisted");
        }
        await supabaseAdmin.from("profiles").update({ email: patch.owner_email }).eq("id", uid);
      }
    }


    const { error } = await supabaseAdmin.from("tenants").update(patch).eq("id", id);
    if (error) {
      if (/duplicate|unique/i.test(error.message)) throw new Error("slug_in_use");
      throw new Error(error.message);
    }
    // Mantém availability.business_name sincronizado com o nome da empresa
    // para que o site público não exiba o nome antigo enquanto carrega.
    if (typeof patch.name === "string" && patch.name.length > 0) {
      await supabaseAdmin.from("availability").update({ business_name: patch.name }).eq("tenant_id", id);
    }
    // Sincroniza nome do responsável com a conta dele (auth + profiles),
    // para que o painel e os e-mails enviados usem o nome atualizado.
    if (typeof patch.owner_name === "string" && patch.owner_name.length > 0) {
      const { data: roles } = await supabaseAdmin
        .from("user_roles").select("user_id").eq("tenant_id", id).eq("role", "owner").limit(1);
      if (roles && roles.length > 0) {
        const uid = roles[0].user_id;
        try {
          await adminAuthFetch(`users/${uid}`, {
            method: "PUT",
            body: { user_metadata: { name: patch.owner_name } },
          });
        } catch { /* não bloqueia o save se auth metadata falhar */ }
        await supabaseAdmin.from("profiles").update({ name: patch.owner_name }).eq("id", uid);
      }
    }
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId, tenant_id: id, action: "tenant_updated",
      details: { ...patch, uazapi_token: patch.uazapi_token ? "***" : patch.uazapi_token },
    });
    return { ok: true };
  });

export const adminConfirmPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({
      tenant_id: z.string().uuid(),
      amount: z.number().min(0),
      method: z.string().default("manual"),
      reference: z.string().optional(),
      notes: z.string().optional(),
    }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: pid, error } = await context.supabase.rpc("confirm_payment", {
      _tenant_id: data.tenant_id,
      _amount: data.amount,
      _method: data.method,
      _reference: data.reference,
      _notes: data.notes,
    } as any);
    if (error) throw new Error(error.message);
    return { id: pid as string };
  });

export const adminSetTenantStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(["active", "late", "blocked"]),
      reason: z.string().optional(),
    }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await supabaseAdmin.from("tenants").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId, tenant_id: data.id,
      action: data.status === "blocked" ? "tenant_blocked" : data.status === "active" ? "tenant_reactivated" : "tenant_marked_late",
      details: { reason: data.reason ?? null },
    });
    return { ok: true };
  });

export const adminCreateTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({
      name: z.string().min(2).max(100),
      slug: z.string().min(2).max(50).regex(/^[a-z0-9-]+$/, "slug inválido"),
      owner_name: z.string().min(2).max(100),
      owner_email: z.string().email(),
      owner_phone: z.string().min(8).max(20),
      owner_password: z.string().min(6).max(72),
      monthly_price: z.number().min(0).default(99),
      primary_color: z.string().optional(),
    }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const slug = data.slug.trim().toLowerCase();

    // Verifica se slug já existe
    const { data: existing } = await supabaseAdmin.from("tenants").select("id").eq("slug", slug).maybeSingle();
    if (existing) throw new Error("slug_in_use");

    // Cria tenant
    const tenantId = crypto.randomUUID();
    const { error: tErr } = await supabaseAdmin.from("tenants").insert({
      id: tenantId,
      slug,
      name: data.name.trim(),
      active: true,
      plan: "basic",
      primary_color: data.primary_color ?? "#d4a64a",
      owner_name: data.owner_name,
      owner_email: data.owner_email,
      owner_phone: data.owner_phone,
      monthly_price: data.monthly_price,
      status: "active",
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    });
    if (tErr) throw new Error(tErr.message);

    // Availability default
    await supabaseAdmin.from("availability").insert({ tenant_id: tenantId } as any);

    // Cria user owner com a senha definida pelo admin (fetch direto para evitar quirks do SDK)
    const ownerPassword = data.owner_password;
    let createdUserId: string;
    try {
      const created: any = await adminAuthFetch("users", {
        method: "POST",
        body: {
          email: data.owner_email,
          password: ownerPassword,
          email_confirm: true,
          user_metadata: { name: data.owner_name },
        },
      });
      if (!created?.id) throw new Error("create_user_failed");
      createdUserId = created.id;
    } catch (e: any) {
      await supabaseAdmin.from("tenants").delete().eq("id", tenantId);
      const msg = e?.message ?? "unknown";
      if (/already|exists|registered|duplicate/i.test(msg)) throw new Error("email_in_use");
      throw new Error(`create_user_failed: ${msg}`);
    }

    // profile + role
    await supabaseAdmin.from("profiles").upsert({
      id: createdUserId, name: data.owner_name, email: data.owner_email, whatsapp: data.owner_phone, tenant_id: tenantId, active: true,
    });
    await supabaseAdmin.from("user_roles").insert({
      user_id: createdUserId, role: "owner", tenant_id: tenantId,
    });


    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId, tenant_id: tenantId, action: "tenant_created",
      details: { slug, owner_email: data.owner_email },
    });

    return {
      tenant_id: tenantId, slug,
      owner_email: data.owner_email, temp_password: ownerPassword,
      url: `/b/${slug}/login`,
    };
  });

/** Remove empresa e dados vinculados (irreversível). Exige digitar o slug para confirmar. */
export const adminDeleteTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({
      tenant_id: z.string().uuid(),
      confirm_slug: z.string().min(2).max(50),
    }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: tenant, error: tErr } = await supabaseAdmin
      .from("tenants")
      .select("id, slug, name")
      .eq("id", data.tenant_id)
      .maybeSingle();
    if (tErr) throw new Error(tErr.message);
    if (!tenant) throw new Error("tenant_not_found");
    if (tenant.slug !== data.confirm_slug.trim().toLowerCase()) {
      throw new Error("confirm_slug_mismatch");
    }

    const tid = tenant.id;
    const { data: ownerRoles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role")
      .eq("tenant_id", tid)
      .in("role", ["owner", "professional"]);

    const tables = [
      "recurrence_send_log",
      "recurrence_queue",
      "recurrence_campaigns",
      "payment_receipts",
      "payments",
      "waitlist",
      "bookings",
      "reviews",
      "blocked_dates",
      "services",
      "professionals",
      "availability",
      "tenant_features",
      "user_roles",
    ] as const;
    for (const table of tables) {
      const { error } = await supabaseAdmin.from(table).delete().eq("tenant_id", tid);
      if (error) throw new Error(`${table}: ${error.message}`);
    }
    await supabaseAdmin.from("profiles").delete().eq("tenant_id", tid);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      tenant_id: tid,
      action: "tenant_deleted",
      details: { slug: tenant.slug, name: tenant.name },
    });
    const { error: delErr } = await supabaseAdmin.from("tenants").delete().eq("id", tid);
    if (delErr) throw new Error(delErr.message);

    for (const r of ownerRoles ?? []) {
      if (!r.user_id) continue;
      try {
        await adminAuthFetch(`users/${r.user_id}`, { method: "DELETE" });
      } catch {
        /* usuário pode estar em outro tenant */
      }
    }

    return { ok: true, slug: tenant.slug };
  });

export const adminResetTenantOwnerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    tenant_id: z.string().uuid(),
    new_password: z.string().min(6).max(72),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);

    // 1) Tenta achar owner já vinculado em user_roles
    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("user_id")
      .eq("tenant_id", data.tenant_id)
      .eq("role", "owner")
      .limit(1);

    let uid: string | undefined = roles?.[0]?.user_id;
    let healed = false;

    // 2) Auto-heal: nenhum vínculo owner → usar tenant.owner_email para localizar/criar o usuário
    if (!uid) {
      const { data: tenant } = await supabaseAdmin
        .from("tenants")
        .select("id, owner_email, owner_name, owner_phone")
        .eq("id", data.tenant_id)
        .maybeSingle();
      if (!tenant?.owner_email) {
        throw new Error("owner_email_missing: cadastre o e-mail do dono em Empresas antes de redefinir a senha.");
      }

      // Procura por e-mail no GoTrue admin
      try {
        const list: any = await adminAuthFetch(
          `users?filter=${encodeURIComponent(`email.eq.${tenant.owner_email}`)}`,
          { method: "GET" },
        );
        uid = list?.users?.[0]?.id;
      } catch { /* segue para criar */ }

      // Se ainda não existir, cria o usuário com a senha fornecida
      if (!uid) {
        const created: any = await adminAuthFetch("users", {
          method: "POST",
          body: {
            email: tenant.owner_email,
            password: data.new_password,
            email_confirm: true,
            user_metadata: { name: tenant.owner_name ?? tenant.owner_email },
          },
        });
        if (!created?.id) throw new Error("create_owner_failed");
        uid = created.id;
      }

      // Garante profile + role owner para esta empresa
      await supabaseAdmin.from("profiles").upsert({
        id: uid!,
        name: tenant.owner_name ?? tenant.owner_email,
        email: tenant.owner_email,
        whatsapp: tenant.owner_phone ?? null,
        tenant_id: data.tenant_id,
        active: true,
      });
      await supabaseAdmin.from("user_roles").upsert(
        { user_id: uid, role: "owner", tenant_id: data.tenant_id } as any,
        { onConflict: "user_id,role,tenant_id" } as any,
      );
      healed = true;
    }

    // 3) Aplica a nova senha (idempotente)
    await adminAuthFetch(`users/${uid!}`, {
      method: "PUT",
      body: { password: data.new_password, email_confirm: true },
    });

    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId,
      tenant_id: data.tenant_id,
      action: "password_reset",
      details: { healed },
    });
    return { ok: true, healed };
  });

// ---------- Payments / Audit list ----------
export const adminListPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [{ data: payments }, { data: tenants }] = await Promise.all([
      supabaseAdmin.from("payments").select("*").order("paid_at", { ascending: false }).limit(500),
      supabaseAdmin.from("tenants").select("id, name, slug"),
    ]);
    const byId = new Map<string, any>(); (tenants ?? []).forEach((t: any) => byId.set(t.id, t));
    return { payments: (payments ?? []).map((p: any) => ({ ...p, tenant: byId.get(p.tenant_id) ?? null })) };
  });

export const adminListAudit = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [{ data: logs }, { data: tenants }] = await Promise.all([
      supabaseAdmin.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(300),
      supabaseAdmin.from("tenants").select("id, name, slug"),
    ]);
    const byId = new Map<string, any>(); (tenants ?? []).forEach((t: any) => byId.set(t.id, t));
    return { logs: (logs ?? []).map((l: any) => ({ ...l, tenant: l.tenant_id ? byId.get(l.tenant_id) ?? null : null })) };
  });

// ---------- Whoami (admin check for client guard) ----------
export const adminWhoami = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("is_admin", { _user_id: context.userId });
    return { isAdmin: !!data, userId: context.userId };
  });

// ---------- Global app settings (PIX + default grace days) ----------
export const adminGetAppSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await supabaseAdmin.from("app_settings").select("*").eq("id", true).maybeSingle();
    return { settings: data ?? null };
  });

export const adminUpdateAppSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    pix_key: z.string().max(200).nullable().optional(),
    pix_key_type: z.string().max(20).nullable().optional(),
    pix_beneficiary_name: z.string().max(100).nullable().optional(),
    pix_beneficiary_city: z.string().max(50).nullable().optional(),
    pix_instructions: z.string().max(500).nullable().optional(),
    default_blocked_grace_days: z.number().int().min(0).max(60).optional(),
    apply_grace_to_all: z.boolean().optional(),
    uazapi_base_url: z.string().max(300).nullable().optional(),
    email_from_name: z.string().max(100).optional(),
    email_from_local: z.string().max(80).regex(/^[a-z0-9._-]+$/i).optional(),
    recurrence_min_interval_seconds: z.number().int().min(0).max(3600).optional(),
    recurrence_batch_size: z.number().int().min(1).max(500).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { apply_grace_to_all, ...patch } = data;
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update({ ...patch, updated_by: context.userId, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) throw new Error(error.message);
    if (apply_grace_to_all && typeof patch.default_blocked_grace_days === "number") {
      const { error: uErr } = await supabaseAdmin
        .from("tenants")
        .update({ blocked_grace_days: patch.default_blocked_grace_days })
        .gte("monthly_price", 0);
      if (uErr) throw new Error(uErr.message);
      await supabaseAdmin.rpc("refresh_all_tenant_statuses");
    }
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId, action: "app_settings_updated",
      details: { ...patch, apply_grace_to_all: !!apply_grace_to_all },
    });
    return { ok: true };
  });

// ---------- Receipts review (admin) ----------
export const adminListReceipts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) =>
    z.object({ status: z.enum(["pending","approved","rejected","all"]).default("pending") }).parse(d ?? {}))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = supabaseAdmin.from("payment_receipts").select("*")
      .order("created_at", { ascending: false }).limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: receipts } = await q;
    const ids = Array.from(new Set((receipts ?? []).map((r: any) => r.tenant_id)));
    const tenantsRes = ids.length
      ? await supabaseAdmin.from("tenants").select("id, name, slug, monthly_price, due_date, status").in("id", ids)
      : { data: [] as any[] };
    const byId = new Map<string, any>(); (tenantsRes.data ?? []).forEach((t: any) => byId.set(t.id, t));
    return { receipts: (receipts ?? []).map((r: any) => ({ ...r, tenant: byId.get(r.tenant_id) ?? null })) };
  });

export const adminReviewReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    receipt_id: z.string().uuid(),
    decision: z.enum(["approve", "reject"]),
    rejection_reason: z.string().max(300).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.rpc("admin_review_receipt", {
      _receipt_id: data.receipt_id,
      _decision: data.decision,
      _rejection_reason: data.rejection_reason ?? null,
    } as any);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Signed URL for previewing receipt files (private bucket)
export const adminSignReceiptUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    const { data: signed, error } = await supabaseAdmin.storage
      .from("payment-receipts").createSignedUrl(data.path, 60 * 60);
    if (error || !signed) throw new Error(error?.message ?? "sign_failed");
    return { url: signed.signedUrl };
  });

// ---------- Client: own subscription / payments ----------
export const tenantSubscription = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ tenant_id: z.string().uuid() }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: belongs } = await context.supabase.rpc("user_belongs_to_tenant", {
      _user_id: context.userId, _tenant_id: data.tenant_id,
    });
    if (!belongs) throw new Error("forbidden");
    const { data: tenant } = await supabaseAdmin
      .from("tenants").select("id, name, status, due_date, monthly_price, last_payment_at").eq("id", data.tenant_id).maybeSingle();
    const { data: payments } = await supabaseAdmin
      .from("payments").select("id, amount, paid_at, method, reference").eq("tenant_id", data.tenant_id).order("paid_at", { ascending: false }).limit(24);
    const { data: fin } = await supabaseAdmin.rpc("tenant_financial_status", { _tenant_id: data.tenant_id });
    const { data: receipts } = await supabaseAdmin
      .from("payment_receipts").select("id, amount, status, note, file_url, file_path, created_at, reviewed_at, rejection_reason")
      .eq("tenant_id", data.tenant_id).order("created_at", { ascending: false }).limit(24);
    const { data: pix } = await supabaseAdmin
      .from("app_settings").select("pix_key, pix_key_type, pix_beneficiary_name, pix_beneficiary_city, pix_instructions").eq("id", true).maybeSingle();
    return {
      tenant,
      payments: payments ?? [],
      receipts: receipts ?? [],
      financial: (fin as any[] | null)?.[0] ?? null,
      pix: pix ?? null,
    };
  });

// Submete um comprovante (dono do tenant).
export const tenantSubmitReceipt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    tenant_id: z.string().uuid(),
    amount: z.number().min(0),
    file_path: z.string().min(1).max(500),
    file_url: z.string().url(),
    note: z.string().max(500).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    const { data: belongs } = await context.supabase.rpc("user_belongs_to_tenant", {
      _user_id: context.userId, _tenant_id: data.tenant_id,
    });
    if (!belongs) throw new Error("forbidden");
    const { data: ins, error } = await supabaseAdmin.from("payment_receipts").insert({
      tenant_id: data.tenant_id,
      amount: data.amount,
      file_path: data.file_path,
      file_url: data.file_url,
      note: data.note ?? null,
      status: "pending",
      submitted_by: context.userId,
    }).select("id").single();
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId, tenant_id: data.tenant_id, action: "receipt_submitted",
      details: { receipt_id: ins.id, amount: data.amount },
    });
    return { id: ins.id };
  });

// ---------- Recorrência (admin global) ----------
export const adminRecurrenceOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const now = new Date();
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(dayStart); weekStart.setDate(weekStart.getDate() - 6);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [{ data: log }, { data: queue }, { data: tenants }] = await Promise.all([
      supabaseAdmin.from("recurrence_send_log")
        .select("tenant_id,channel,status,error,recipient,message_preview,created_at,campaign_id")
        .gte("created_at", monthStart.toISOString())
        .order("created_at", { ascending: false }).limit(500),
      supabaseAdmin.from("recurrence_queue")
        .select("id,tenant_id,channel,status,error,scheduled_for,attempts,created_at,campaign_id")
        .in("status", ["queued", "failed", "skipped"])
        .order("created_at", { ascending: false }).limit(300),
      supabaseAdmin.from("tenants")
        .select("id,name,slug,whatsapp_enabled,uazapi_token"),
    ]);

    const tenantsById = new Map<string, any>();
    (tenants ?? []).forEach((t: any) => tenantsById.set(t.id, { id: t.id, name: t.name, slug: t.slug, whatsapp_enabled: !!t.whatsapp_enabled, has_token: !!t.uazapi_token }));

    const totals = { today: { email: 0, whatsapp: 0 }, week: { email: 0, whatsapp: 0 }, month: { email: 0, whatsapp: 0 } };
    const errors: any[] = [];
    for (const l of (log ?? []) as any[]) {
      if (l.status === "sent") {
        const ts = new Date(l.created_at);
        const ch = l.channel === "whatsapp" ? "whatsapp" : "email";
        totals.month[ch]++;
        if (ts >= weekStart) totals.week[ch]++;
        if (ts >= dayStart) totals.today[ch]++;
      }
      if ((l.status === "failed" || l.status === "skipped") && errors.length < 50) {
        errors.push({ ...l, tenant: tenantsById.get(l.tenant_id) ?? null });
      }
    }

    const queueRows = (queue ?? []).map((q: any) => ({ ...q, tenant: tenantsById.get(q.tenant_id) ?? null }));
    const queuedCount = queueRows.filter((q) => q.status === "queued").length;
    const failedCount = queueRows.filter((q) => q.status === "failed").length;
    const skippedCount = queueRows.filter((q) => q.status === "skipped").length;

    return {
      totals,
      queue: queueRows,
      queueStats: { queued: queuedCount, failed: failedCount, skipped: skippedCount },
      errors,
      tenants: Array.from(tenantsById.values()),
    };
  });

export const adminRetryQueueItems = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    ids: z.array(z.string().uuid()).min(1).max(500).optional(),
    scope: z.enum(["failed", "skipped", "all_non_sent"]).optional(),
  }).parse(d))
  .handler(async ({ context, data }) => {
    await assertAdmin(context);
    let q = supabaseAdmin.from("recurrence_queue")
      .update({ status: "queued", attempts: 0, error: null, scheduled_for: new Date().toISOString() });
    if (data.ids && data.ids.length) {
      q = q.in("id", data.ids);
    } else if (data.scope === "failed") {
      q = q.eq("status", "failed");
    } else if (data.scope === "skipped") {
      q = q.eq("status", "skipped");
    } else if (data.scope === "all_non_sent") {
      q = q.in("status", ["failed", "skipped"]);
    } else {
      throw new Error("nothing_to_retry");
    }
    const { error, data: updated } = await q.select("id");
    const count = updated?.length ?? 0;
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("audit_logs").insert({
      actor_id: context.userId, action: "recurrence_retry",
      details: { count: count ?? 0, scope: data.scope ?? "ids" },
    });
    return { ok: true, count: count ?? 0 };
  });

