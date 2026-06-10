import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Search, Sparkles } from "lucide-react";
import { markeeGetLeadStatus } from "@/lib/markee.functions";

type TrackingSearch = { ticket?: string };

export const Route = createFileRoute("/b/markee/acompanhamento")({
  component: MarkeeTracking,
  validateSearch: (s: Record<string, unknown>): TrackingSearch => ({
    ticket: typeof s.ticket === "string" ? s.ticket : undefined,
  }),
  head: () => ({ meta: [{ title: "Acompanhar chamado — Markee" }] }),
});

const STATUS_FLOW = [
  { key: "em_analise", label: "Em análise", desc: "Recebemos sua proposta e já estamos avaliando." },
  { key: "personalizando", label: "Personalizando sua agenda", desc: "Estamos montando sua agenda com sua identidade." },
  { key: "pronto", label: "Pronto pra você", desc: "Tudo configurado — enviamos os acessos no WhatsApp e e-mail." },
  { key: "ativo", label: "Período grátis ativo", desc: "Aproveite seus 7 dias por nossa conta." },
] as const;

type Lead = {
  ticket_number: string;
  business_name: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function MarkeeTracking() {
  const { ticket: ticketFromUrl } = useSearch({ from: "/b/markee/acompanhamento" });
  const getStatus = useServerFn(markeeGetLeadStatus);
  const [query, setQuery] = useState(ticketFromUrl ?? "");
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const search = async (q: string) => {
    if (!q.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const isTicket = /^MKE-/i.test(q.trim()) || /^\d{4,}$/.test(q.trim());
      const ticket = isTicket
        ? (q.trim().toUpperCase().startsWith("MKE-")
            ? q.trim().toUpperCase()
            : `MKE-${q.trim().padStart(6, "0")}`)
        : undefined;
      const whatsapp = isTicket ? undefined : q.trim();
      const res = await getStatus({ data: { ticket, whatsapp } });
      const first = (res.leads || [])[0] as Lead | undefined;
      setLead(first ?? null);
      if (!first) setError("Nenhum chamado encontrado. Confira o número ou o WhatsApp.");
    } catch (e: any) {
      setError(e?.message || "Não foi possível consultar agora.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (ticketFromUrl) {
      void search(ticketFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketFromUrl]);

  // Polling leve (15s) quando há lead em andamento
  useEffect(() => {
    if (!lead) return;
    if (lead.status === "ativo" || lead.status === "rejeitado") return;
    const id = setInterval(() => {
      void search(lead.ticket_number);
    }, 15000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.ticket_number, lead?.status]);

  const currentIdx = lead ? STATUS_FLOW.findIndex((s) => s.key === lead.status) : -1;

  return (
    <section className="pt-6 md:pt-12">
      <motion.header initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
          <Sparkles size={12} /> Acompanhamento
        </div>
        <h1 className="markee-display mt-4 text-3xl font-bold sm:text-4xl">
          Acompanhe seu <span className="markee-grad-text">chamado</span>
        </h1>
        <p className="mt-2 text-[color:var(--muted-foreground)]">
          Informe o número do chamado (MKE-000000) ou seu WhatsApp.
        </p>
      </motion.header>

      <form
        onSubmit={(e) => { e.preventDefault(); void search(query); }}
        className="markee-glass mt-6 flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
      >
        <div className="flex flex-1 items-center gap-2">
          <Search size={18} className="text-[color:var(--muted-foreground)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="markee-input"
            placeholder="MKE-000123 ou (11) 99999-9999"
          />
        </div>
        <button type="submit" disabled={loading} className="markee-cta disabled:opacity-60">
          {loading ? "Buscando…" : "Buscar"}
        </button>
      </form>

      {error && searched && !lead && (
        <p className="mt-6 text-sm text-[color:var(--muted-foreground)]">{error}</p>
      )}

      {lead && (
        <motion.article
          key={lead.ticket_number}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="markee-glass mt-8 p-6"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <div className="text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">Chamado</div>
              <div className="markee-display text-2xl font-semibold">{lead.ticket_number}</div>
              <div className="mt-1 text-sm text-[color:var(--muted-foreground)]">{lead.business_name}</div>
            </div>
            <div className="text-sm text-[color:var(--muted-foreground)]">
              Aberto em {new Date(lead.created_at).toLocaleDateString("pt-BR")}
            </div>
          </div>

          <ol className="mt-6 space-y-4">
            {STATUS_FLOW.map((s, i) => {
              const isDone = i < currentIdx;
              const isCurrent = i === currentIdx;
              return (
                <li key={s.key} className="flex gap-3">
                  <div className="mt-0.5">
                    {isDone ? (
                      <CheckCircle2 size={22} className="text-[color:var(--primary)]" />
                    ) : isCurrent ? (
                      <span className="relative grid h-[22px] w-[22px] place-items-center">
                        <span className="absolute inset-0 animate-ping rounded-full bg-[color:var(--primary)]/40" />
                        <span className="relative h-3 w-3 rounded-full bg-[color:var(--primary)]" />
                      </span>
                    ) : (
                      <Clock size={22} className="text-[color:var(--muted-foreground)]" />
                    )}
                  </div>
                  <div>
                    <div
                      className={
                        isCurrent
                          ? "font-semibold text-[color:var(--foreground)]"
                          : isDone
                            ? "text-[color:var(--foreground)]"
                            : "text-[color:var(--muted-foreground)]"
                      }
                    >
                      {s.label}
                    </div>
                    <div className="text-sm text-[color:var(--muted-foreground)]">{s.desc}</div>
                  </div>
                </li>
              );
            })}
          </ol>

          {lead.status === "rejeitado" && (
            <p className="mt-6 text-sm text-red-300">
              Sua proposta não pôde ser aprovada no momento. Entre em contato com o suporte para mais detalhes.
            </p>
          )}
        </motion.article>
      )}
    </section>
  );
}
