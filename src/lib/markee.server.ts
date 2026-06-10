// Server-only helpers for sending Markee onboarding notifications.
// Uses the Markee-level uazapi token (app_settings.uazapi_*) and Resend.

import { supabaseAdmin } from "@/integrations/supabase/client.server";

type Settings = {
  uazapi_base_url: string | null;
  uazapi_token: string | null;
  email_from_name: string;
  email_from_local: string;
};

async function loadSettings(): Promise<Settings> {
  const { data } = await supabaseAdmin
    .from("app_settings")
    .select("uazapi_base_url,uazapi_token,email_from_name,email_from_local")
    .eq("id", true)
    .maybeSingle();
  return (data as any) ?? {
    uazapi_base_url: null,
    uazapi_token: null,
    email_from_name: "Markee",
    email_from_local: "contato",
  };
}

async function sendWhatsApp(to: string, text: string) {
  const s = await loadSettings();
  if (!s.uazapi_base_url || !s.uazapi_token) {
    return { ok: false, skipped: true, error: "uazapi_not_configured" };
  }
  try {
    const url = `${s.uazapi_base_url.replace(/\/$/, "")}/send/text`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", token: s.uazapi_token },
      body: JSON.stringify({ number: to, text }),
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

async function sendEmail(to: string, subject: string, html: string) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, error: "resend_not_configured" };
  const s = await loadSettings();
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        from: `${s.email_from_name} <${s.email_from_local}@markee.app>`,
        to: [to],
        subject,
        html,
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

export async function notifyLeadCreated(opts: {
  ticket: string; ownerName: string; businessName: string; whatsapp: string; email: string;
}) {
  const wa = opts.whatsapp.replace(/\D/g, "");
  const txt =
    `Olá ${opts.ownerName}! Recebemos sua proposta para *${opts.businessName}*. ` +
    `Seu chamado é *${opts.ticket}*. Em instantes nossa equipe começa a personalizar sua agenda. ` +
    `Acompanhe em https://markee.app/b/markee/acompanhamento?ticket=${opts.ticket}`;
  const html =
    `<p>Olá ${opts.ownerName},</p>` +
    `<p>Recebemos a proposta de <strong>${opts.businessName}</strong>. Seu chamado é <strong>${opts.ticket}</strong>.</p>` +
    `<p>Você pode acompanhar o andamento por aqui: ` +
    `<a href="https://markee.app/b/markee/acompanhamento?ticket=${opts.ticket}">acompanhar chamado</a>.</p>` +
    `<p>— Equipe Markee</p>`;
  await Promise.allSettled([
    sendWhatsApp(wa, txt),
    sendEmail(opts.email, `Recebemos sua proposta — ${opts.ticket}`, html),
  ]);
}

const STATUS_LABEL: Record<string, string> = {
  em_analise: "Em análise",
  personalizando: "Personalizando sua agenda",
  pronto: "Pronto pra você",
  ativo: "Período grátis ativo",
  rejeitado: "Não aprovado",
};

export async function notifyLeadStatus(opts: {
  ticket: string; ownerName: string; businessName: string;
  whatsapp: string; email: string; status: string; message?: string | null;
}) {
  const label = STATUS_LABEL[opts.status] ?? opts.status;
  const wa = opts.whatsapp.replace(/\D/g, "");
  const extra = opts.message ? `\n\n${opts.message}` : "";
  const txt =
    `Olá ${opts.ownerName}! Atualização do seu chamado *${opts.ticket}* (${opts.businessName}): ` +
    `*${label}*.${extra}\n\nAcompanhe: https://markee.app/b/markee/acompanhamento?ticket=${opts.ticket}`;
  const html =
    `<p>Olá ${opts.ownerName},</p>` +
    `<p>Seu chamado <strong>${opts.ticket}</strong> agora está em: <strong>${label}</strong>.</p>` +
    (opts.message ? `<p>${opts.message}</p>` : "") +
    `<p><a href="https://markee.app/b/markee/acompanhamento?ticket=${opts.ticket}">Acompanhar chamado</a></p>` +
    `<p>— Equipe Markee</p>`;
  await Promise.allSettled([
    sendWhatsApp(wa, txt),
    sendEmail(opts.email, `Atualização — ${opts.ticket}`, html),
  ]);
}

export async function notifyLeadReady(opts: {
  ticket: string; ownerName: string; businessName: string;
  whatsapp: string; email: string; slug: string;
  loginUrl: string | null; trialDays: number;
}) {
  const wa = opts.whatsapp.replace(/\D/g, "");
  const painel = `https://markee-agendamentos.lovable.app/b/${opts.slug}/painel`;
  const link = opts.loginUrl ?? painel;
  const txt =
    `🎉 ${opts.ownerName}, sua agenda *${opts.businessName}* já está no ar!\n\n` +
    `Você começou seu período grátis de *${opts.trialDays} dias*. Acesse seu painel pelo link abaixo ` +
    `(login automático por este link único — não compartilhe):\n\n${link}\n\n` +
    `Endereço público para seus clientes: https://markee-agendamentos.lovable.app/b/${opts.slug}`;
  const html =
    `<p>Olá ${opts.ownerName},</p>` +
    `<p>Sua agenda <strong>${opts.businessName}</strong> está pronta. ` +
    `Você começou o período grátis de <strong>${opts.trialDays} dias</strong>.</p>` +
    `<p><a href="${link}">Entrar no meu painel</a> (link de acesso único — não compartilhe)</p>` +
    `<p>Endereço público da sua agenda: ` +
    `<a href="https://markee-agendamentos.lovable.app/b/${opts.slug}">markee-agendamentos.lovable.app/b/${opts.slug}</a></p>` +
    `<p>— Equipe Markee</p>`;
  await Promise.allSettled([
    sendWhatsApp(wa, txt),
    sendEmail(opts.email, `Sua agenda Markee está pronta — ${opts.ticket}`, html),
  ]);
}

