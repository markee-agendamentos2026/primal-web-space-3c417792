import { AlertOctagon, Calendar, CreditCard, MessageCircle, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export type BlockedTenantInfo = {
  id: string;
  name: string;
  slug: string;
  status: string;
  effective_status: string;
  due_date: string | null;
  monthly_price: number | null;
  owner_phone: string | null;
  primary_color: string | null;
  trial_ends_at?: string | null;
};

const brl = (v: number | null) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const fmtDate = (d: string | null) => (d ? new Date(d + "T00:00:00").toLocaleDateString("pt-BR") : "—");

function buildWaUrl(phone: string | null, tenantName: string) {
  const digits = (phone || "").replace(/\D/g, "");
  const msg = encodeURIComponent(
    `Olá! Preciso regularizar a assinatura da empresa ${tenantName} na Markee.`,
  );
  // Suporte Markee fallback se o tenant não tiver telefone
  const target = digits.length >= 10 ? digits : "5500000000000";
  return `https://wa.me/${target}?text=${msg}`;
}

export function TenantBlockedScreen({ tenant }: { tenant: BlockedTenantInfo }) {
  const [reloading, setReloading] = useState(false);
  // Auto-refresh: a cada 30s revalida — assim que o admin confirma pagamento,
  // a tela libera sozinha sem precisar recriar sessão.
  useEffect(() => {
    const t = setInterval(() => window.location.reload(), 30000);
    return () => clearInterval(t);
  }, []);

  const wa = buildWaUrl(tenant.owner_phone, tenant.name);
  const initial = (tenant.name || "M").trim().charAt(0).toUpperCase();
  const accent = tenant.primary_color || "#d4a64a";

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-neutral-950/95 backdrop-blur-2xl px-5">
      <div className="w-full max-w-md animate-fade-up">
        <div className="glass border-rose-500/20 p-6 md:p-8 rounded-3xl">
          <div className="flex items-center gap-3">
            <div
              className="grid h-12 w-12 place-items-center rounded-2xl text-lg font-display text-neutral-950"
              style={{ background: accent }}
            >
              {initial}
            </div>
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Markee</div>
              <div className="truncate text-base font-semibold">{tenant.name}</div>
            </div>
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4">
            <AlertOctagon size={20} className="mt-0.5 shrink-0 text-rose-300" />
            <div>
              <div className="text-sm font-semibold text-rose-100">Assinatura pendente</div>
              <p className="mt-1 text-sm text-rose-100/80">
                Regularize para voltar a utilizar a plataforma. Nenhum dado foi apagado — assim que o pagamento for
                confirmado, o acesso é liberado automaticamente.
              </p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div className="glass rounded-2xl p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Mensalidade</div>
              <div className="mt-1 flex items-center gap-1.5 font-medium">
                <CreditCard size={14} className="text-primary" />
                {brl(tenant.monthly_price)}
              </div>
            </div>
            <div className="glass rounded-2xl p-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Vencimento</div>
              <div className="mt-1 flex items-center gap-1.5 font-medium">
                <Calendar size={14} className="text-primary" />
                {fmtDate(tenant.due_date)}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-2">
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl p-4 text-sm font-semibold"
            >
              <CreditCard size={16} /> Regularizar pagamento
            </a>
            <a
              href={wa}
              target="_blank"
              rel="noreferrer"
              className="glass flex w-full items-center justify-center gap-2 rounded-2xl p-4 text-sm"
            >
              <MessageCircle size={16} className="text-emerald-400" /> Falar com suporte no WhatsApp
            </a>
            <button
              type="button"
              onClick={() => { setReloading(true); window.location.reload(); }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl p-3 text-xs text-muted-foreground hover:text-foreground transition"
            >
              <RefreshCw size={12} className={reloading ? "animate-spin" : ""} />
              Já paguei — verificar novamente
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Markee · Plataforma de agendamentos
        </p>
      </div>
    </div>
  );
}
