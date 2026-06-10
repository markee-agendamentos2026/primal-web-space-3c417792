// Server functions do onboarding Markee (chamados/leads).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createSchema = z.object({
  business_name: z.string().min(2).max(120),
  owner_name: z.string().min(2).max(120),
  whatsapp: z.string().min(8).max(25),
  email: z.string().email().max(160),
  segment: z.enum(["barbearia", "salao", "estetica", "nail", "outros"]),
  segment_other: z.string().max(80).optional(),
  about: z.string().max(500).optional(),
  primary_color: z.string().max(20).optional(),
  primary_glow_color: z.string().max(20).optional(),
  secondary_color: z.string().max(20).optional(),
});

export const markeeCreateLead = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("markee_create_lead", {
      _business_name: data.business_name,
      _owner_name: data.owner_name,
      _whatsapp: data.whatsapp,
      _email: data.email,
      _segment: data.segment,
      _segment_other: data.segment_other ?? null,
      _about: data.about ?? null,
      _primary_color: data.primary_color ?? null,
      _primary_glow_color: data.primary_glow_color ?? null,
      _secondary_color: data.secondary_color ?? null,
    } as any);
    if (error) throw new Error(error.message);
    const row = Array.isArray(rows) ? rows[0] : rows;
    const ticket = (row as any)?.ticket_number as string;

    // Notificação assíncrona — não bloqueia resposta para o cliente.
    try {
      const { notifyLeadCreated } = await import("./markee.server");
      await notifyLeadCreated({
        ticket,
        ownerName: data.owner_name,
        businessName: data.business_name,
        whatsapp: data.whatsapp,
        email: data.email,
      });
    } catch {
      /* não bloqueia criação */
    }

    return { id: (row as any)?.id as string, ticket_number: ticket };
  });

const statusSchema = z.object({
  ticket: z.string().max(40).optional(),
  whatsapp: z.string().max(25).optional(),
}).refine((d) => !!d.ticket || !!d.whatsapp, { message: "ticket_or_whatsapp_required" });

export const markeeGetLeadStatus = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => statusSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin.rpc("markee_get_lead_status", {
      _ticket: data.ticket ?? null,
      _whatsapp: data.whatsapp ?? null,
    } as any);
    if (error) throw new Error(error.message);
    return { leads: (rows as any[]) ?? [] };
  });

// ---------- Admin ----------

export const markeeAdminListLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId } as any);
    if (!isAdmin) throw new Error("forbidden");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("markee_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw new Error(error.message);
    return { leads: data ?? [] };
  });

const updateSchema = z.object({
  lead_id: z.string().uuid(),
  new_status: z.enum(["em_analise", "personalizando", "pronto", "ativo", "rejeitado"]),
  message: z.string().max(1000).optional(),
});

export const markeeAdminUpdateStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId } as any);
    if (!isAdmin) throw new Error("forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("markee_admin_update_status", {
      _lead_id: data.lead_id,
      _new_status: data.new_status,
      _message: data.message ?? null,
    } as any);
    if (error) throw new Error(error.message);

    const { data: lead } = await supabaseAdmin
      .from("markee_leads")
      .select("ticket_number,owner_name,business_name,whatsapp,email")
      .eq("id", data.lead_id)
      .maybeSingle();
    if (lead) {
      try {
        const { notifyLeadStatus } = await import("./markee.server");
        await notifyLeadStatus({
          ticket: (lead as any).ticket_number,
          ownerName: (lead as any).owner_name,
          businessName: (lead as any).business_name,
          whatsapp: (lead as any).whatsapp,
          email: (lead as any).email,
          status: data.new_status,
          message: data.message ?? null,
        });
      } catch { /* ignora */ }
    }

    return { ok: true };
  });

// ---------- Conversão lead → tenant (admin) ----------

const convertSchema = z.object({
  lead_id: z.string().uuid(),
  slug: z.string().min(2).max(40).regex(/^[a-z0-9-]+$/, "slug_invalid"),
  monthly_price: z.number().min(0).max(99999).optional(),
  trial_days: z.number().int().min(0).max(60).optional(),
});

export const markeeConvertLeadToTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => convertSchema.parse(d))
  .handler(async ({ context, data }) => {
    const { data: isAdmin } = await context.supabase.rpc("is_admin", { _user_id: context.userId } as any);
    if (!isAdmin) throw new Error("forbidden");
    if (data.slug === "markee") throw new Error("slug_reserved");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Lê o lead
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from("markee_leads")
      .select("id,ticket_number,owner_name,business_name,whatsapp,email,status,created_tenant_id")
      .eq("id", data.lead_id)
      .maybeSingle();
    if (leadErr) throw new Error(leadErr.message);
    if (!lead) throw new Error("lead_not_found");
    if ((lead as any).created_tenant_id) throw new Error("lead_already_converted");

    // Cria (ou recupera) usuário do dono em auth.users
    let ownerUserId: string | null = null;
    try {
      const created = await supabaseAdmin.auth.admin.createUser({
        email: (lead as any).email,
        email_confirm: true,
        user_metadata: { name: (lead as any).owner_name, source: "markee_onboarding" },
      });
      if (created.data?.user?.id) ownerUserId = created.data.user.id;
      else if (created.error && !/already.*registered|exists/i.test(created.error.message)) {
        throw new Error(created.error.message);
      }
    } catch (e: any) {
      if (!/already.*registered|exists/i.test(e?.message || "")) throw e;
    }
    if (!ownerUserId) {
      // Já existe — busca pelo e-mail
      const list = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const found = list.data?.users?.find(
        (u) => u.email?.toLowerCase() === ((lead as any).email as string).toLowerCase(),
      );
      if (found) ownerUserId = found.id;
    }

    // Cria tenant + vincula dono via RPC
    const { data: convRows, error: convErr } = await supabaseAdmin.rpc("markee_convert_lead_to_tenant", {
      _lead_id: data.lead_id,
      _slug: data.slug,
      _owner_user_id: ownerUserId,
      _monthly_price: data.monthly_price ?? 99,
      _trial_days: data.trial_days ?? 7,
    } as any);
    if (convErr) throw new Error(convErr.message);
    const conv = Array.isArray(convRows) ? convRows[0] : convRows;
    const newSlug = (conv as any)?.slug as string;
    const tenantId = (conv as any)?.tenant_id as string;

    // Gera magic link de login
    let loginUrl: string | null = null;
    try {
      const origin = process.env.PUBLIC_SITE_URL || "https://markee-agendamentos.lovable.app";
      const link = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: (lead as any).email,
        options: { redirectTo: `${origin}/b/${newSlug}/painel` },
      });
      loginUrl = (link.data?.properties as any)?.action_link ?? null;
    } catch { /* segue sem magic link */ }

    // Notifica cliente: empresa pronta + link
    try {
      const { notifyLeadReady } = await import("./markee.server");
      await notifyLeadReady({
        ticket: (lead as any).ticket_number,
        ownerName: (lead as any).owner_name,
        businessName: (lead as any).business_name,
        whatsapp: (lead as any).whatsapp,
        email: (lead as any).email,
        slug: newSlug,
        loginUrl,
        trialDays: data.trial_days ?? 7,
      });
    } catch { /* ignora */ }

    return { tenant_id: tenantId, slug: newSlug, owner_user_id: ownerUserId };
  });

