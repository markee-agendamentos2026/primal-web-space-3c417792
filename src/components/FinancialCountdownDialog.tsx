import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { AlertOctagon, AlertTriangle, CreditCard, Sparkles, X } from "lucide-react";

export type FinancialStatus = {
  tenant_id: string;
  status: string;
  effective_status: "active" | "late" | "blocked" | "trial";
  due_date: string | null;
  days_until_due: number | null;
  days_until_blocked: number | null;
  monthly_price: number | null;
  has_pending_receipt: boolean;
  has_rejected_receipt: boolean;
  trial_ends_at?: string | null;
  trial_days_remaining?: number | null;
};

/**
 * Pop-up financeiro do painel do dono.
 * - Trial (violeta): "Faltam X dias do seu período grátis".
 * - Amarelo: vence em até 5 dias.
 * - Vermelho: atrasado.
 * - Vermelho final: bloqueado.
 */
export function FinancialCountdownDialog({
  fin,
  paymentsHref,
}: {
  fin: FinancialStatus | null;
  paymentsHref: string;
}) {
  const [dismissed, setDismissed] = useState(false);

  const storageKey = fin
    ? `fin-countdown:${fin.tenant_id}:${fin.due_date ?? ""}:${fin.trial_ends_at ?? ""}`
    : "";
  useEffect(() => {
    if (!storageKey) return;
    setDismissed(sessionStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  if (!fin) return null;
  const { effective_status, days_until_due, days_until_blocked, has_pending_receipt, trial_days_remaining } = fin;

  const showTrial = effective_status === "trial" && (trial_days_remaining ?? 0) >= 0;
  const showWarning =
    effective_status === "active" && days_until_due !== null && days_until_due >= 0 && days_until_due <= 5;
  const showLate = effective_status === "late";
  const showBlocked = effective_status === "blocked";
  if (!showTrial && !showWarning && !showLate && !showBlocked) return null;
  if (dismissed && !showBlocked) return null;

  const dismiss = () => {
    if (storageKey) sessionStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  const palette = showBlocked || showLate
    ? { ring: "border-rose-500/40", chip: "bg-rose-500/15 text-rose-100 border-rose-500/30", icon: "text-rose-300" }
    : showTrial
      ? { ring: "border-violet-500/40", chip: "bg-violet-500/15 text-violet-100 border-violet-500/30", icon: "text-violet-300" }
      : { ring: "border-amber-500/40", chip: "bg-amber-500/15 text-amber-100 border-amber-500/30", icon: "text-amber-300" };

  const title = showBlocked
    ? "Sua empresa está bloqueada por falta de pagamento"
    : showLate
      ? `Mensalidade atrasada — bloqueio em ${days_until_blocked ?? 0} dia${(days_until_blocked ?? 0) === 1 ? "" : "s"}`
      : showTrial
        ? (trial_days_remaining === 0
            ? "Último dia do seu período grátis"
            : `Faltam ${trial_days_remaining} dia${trial_days_remaining === 1 ? "" : "s"} do seu período grátis`)
        : `Sua mensalidade vence em ${days_until_due} dia${days_until_due === 1 ? "" : "s"}`;

  const description = showBlocked
    ? "O acesso ao painel e a novos agendamentos está suspenso. Envie o comprovante na tela de Pagamentos para liberar."
    : showLate
      ? "Regularize agora para evitar o bloqueio automático. Envie o comprovante PIX na tela de Pagamentos."
      : showTrial
        ? "Você está aproveitando os 7 dias grátis da Markee. Para continuar sem interrupção quando o período acabar, faça o primeiro pagamento na tela de Pagamentos."
        : "Antecipe o pagamento para evitar atrasos. Você pode pagar via PIX e anexar o comprovante.";

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-neutral-950/70 backdrop-blur-md px-5">
      <div className={`glass w-full max-w-md rounded-3xl border ${palette.ring} p-6 animate-fade-up relative`}>
        {!showBlocked && (
          <button
            onClick={dismiss}
            aria-label="Fechar"
            className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground transition"
          >
            <X size={16} />
          </button>
        )}
        <div className="flex items-start gap-3">
          {showBlocked || showLate ? (
            <AlertOctagon size={22} className={`mt-0.5 ${palette.icon}`} />
          ) : showTrial ? (
            <Sparkles size={22} className={`mt-0.5 ${palette.icon}`} />
          ) : (
            <AlertTriangle size={22} className={`mt-0.5 ${palette.icon}`} />
          )}
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Markee · Financeiro</div>
            <h2 className="mt-1 text-base font-semibold leading-snug">{title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          </div>
        </div>

        {has_pending_receipt ? (
          <div className={`mt-4 rounded-2xl border p-3 text-xs ${palette.chip}`}>
            Já recebemos um comprovante seu. Estamos analisando — assim que aprovado, o acesso é normalizado.
          </div>
        ) : null}

        <div className="mt-5 space-y-2">
          <Link
            to={paymentsHref as any}
            onClick={dismiss}
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-2xl p-4 text-sm font-semibold"
          >
            <CreditCard size={16} /> {showTrial ? "Ativar minha assinatura" : "Ir para Pagamentos"}
          </Link>
          {!showBlocked && (
            <button
              onClick={dismiss}
              className="glass flex w-full items-center justify-center rounded-2xl p-3 text-xs text-muted-foreground hover:text-foreground transition"
            >
              Lembrar mais tarde
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
