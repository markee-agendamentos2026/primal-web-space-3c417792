import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { Database } from "@/integrations/supabase/types";

type ProfessionalUpdate = Database["public"]["Tables"]["professionals"]["Update"];

async function assertOwner(userId: string, tenantId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "owner")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Apenas o proprietário desta empresa pode gerenciar profissionais.");
}

const emailSchema = z.string().trim().email().max(255);
const passSchema = z.string().min(6).max(72);
const nameSchema = z.string().trim().min(1).max(120);

export const createProfessional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      name: nameSchema,
      role: z.string().trim().max(120).optional().nullable(),
      email: emailSchema,
      password: passSchema,
      active: z.boolean().default(true),
      photo_url: z.string().url().max(2048).nullable().optional(),
      tenant_id: z.string().uuid().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    let tenantId = data.tenant_id;
    if (!tenantId) {
      const { data: r } = await supabaseAdmin
        .from("user_roles").select("tenant_id").eq("user_id", context.userId).eq("role", "owner").maybeSingle();
      if (!r?.tenant_id) throw new Error("Tenant não identificado.");
      tenantId = r.tenant_id;
    }
    await assertOwner(context.userId, tenantId);

    // Resolve tenant: explicit input OR caller's owner tenant

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { name: data.name },
    });
    if (cErr || !created.user) throw new Error(cErr?.message || "Falha ao criar usuário.");

    const uid = created.user.id;

    const { error: rErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: uid, role: "professional", tenant_id: tenantId });
    if (rErr) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error(rErr.message);
    }

    const { error: pErr } = await supabaseAdmin
      .from("professionals")
      .insert({ name: data.name, role: data.role ?? null, user_id: uid, active: data.active, photo_url: data.photo_url ?? null, tenant_id: tenantId });
    if (pErr) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error(pErr.message);
    }

    return { ok: true, user_id: uid };
  });


export const updateProfessional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({
      id: z.string().uuid(),
      name: nameSchema.optional(),
      role: z.string().trim().max(120).nullable().optional(),
      active: z.boolean().optional(),
      email: emailSchema.optional(),
      password: passSchema.optional(),
      photo_url: z.string().url().max(2048).nullable().optional(),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: pro, error: gErr } = await supabaseAdmin
      .from("professionals").select("user_id, tenant_id").eq("id", data.id).maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!pro) throw new Error("Profissional não encontrado.");
    await assertOwner(context.userId, pro.tenant_id);

    const updates: ProfessionalUpdate = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.role !== undefined) updates.role = data.role;
    if (data.active !== undefined) updates.active = data.active;
    if (data.photo_url !== undefined) updates.photo_url = data.photo_url;
    if (Object.keys(updates).length) {
      const { error } = await supabaseAdmin
        .from("professionals")
        .update(updates)
        .eq("id", data.id)
        .eq("tenant_id", pro.tenant_id);
      if (error) throw new Error(error.message);
    }


    if ((data.email || data.password) && pro.user_id) {
      const authUpd: any = {};
      if (data.email) authUpd.email = data.email;
      if (data.password) authUpd.password = data.password;
      if (data.name) authUpd.user_metadata = { name: data.name };
      const { error } = await supabaseAdmin.auth.admin.updateUserById(pro.user_id, authUpd);
      if (error) throw new Error(error.message);
    }

    return { ok: true };
  });

export const deleteProfessional = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: pro, error: gErr } = await supabaseAdmin
      .from("professionals").select("user_id, tenant_id").eq("id", data.id).maybeSingle();
    if (gErr) throw new Error(gErr.message);
    if (!pro) throw new Error("Profissional não encontrado.");
    await assertOwner(context.userId, pro.tenant_id);

    const { error: dErr } = await supabaseAdmin
      .from("professionals")
      .delete()
      .eq("id", data.id)
      .eq("tenant_id", pro.tenant_id);
    if (dErr) throw new Error(dErr.message);

    if (pro.user_id) {
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", pro.user_id)
        .eq("tenant_id", pro.tenant_id);
      await supabaseAdmin.auth.admin.deleteUser(pro.user_id);
    }
    return { ok: true };
  });
