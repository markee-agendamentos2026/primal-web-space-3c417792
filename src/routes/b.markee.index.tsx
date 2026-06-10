import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check, Search } from "lucide-react";
import { motion } from "framer-motion";
import { MarkeeFace } from "@/components/markee/MarkeeFace";

export const Route = createFileRoute("/b/markee/")({
  component: MarkeeLanding,
  head: () => ({
    meta: [
      { title: "Markee — Sua agenda inteligente em minutos" },
      {
        name: "description",
        content:
          "7 dias grátis, sem cartão de crédito. Automatize confirmações, lembretes e o dia a dia da sua agenda com a Markee.",
      },
    ],
  }),
});

function MarkeeLanding() {
  return (
    <section className="pt-6 md:pt-12">
      <div className="grid items-center gap-10 md:grid-cols-[1.1fr,1fr]">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--glass-border)] bg-[color:var(--glass)] px-3 py-1 text-xs uppercase tracking-[0.18em] text-[color:var(--muted-foreground)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--primary)]" />
            Onboarding inteligente
          </div>
          <h1 className="markee-display mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
            Sua agenda no <span className="markee-grad-text">piloto automático</span>.
          </h1>
          <p className="mt-5 max-w-xl text-base text-[color:var(--muted-foreground)] sm:text-lg">
            Confirmações, lembretes e agendamentos cuidados por uma IA — pra você focar no atendimento.
            Comece em minutos, do jeitinho da sua marca.
          </p>

          <ul className="mt-6 space-y-2 text-sm">
            {[
              "7 dias grátis pra testar tudo",
              "Sem cartão de crédito, sem pagamento antecipado",
              "Personalizamos sua agenda junto com você",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-[color:var(--primary)]/20 text-[color:var(--primary)]">
                  <Check size={12} />
                </span>
                <span>{t}</span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/b/$slug/comecar"
              params={{ slug: "markee" }}
              className="markee-cta inline-flex items-center gap-2 text-base"
            >
              Começar <ArrowRight size={18} />
            </Link>
            <Link
              to="/b/$slug/acompanhamento"
              params={{ slug: "markee" }}
              className="markee-ghost inline-flex items-center gap-2 text-base"
            >
              <Search size={16} /> Acompanhar chamado
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="flex flex-col items-center justify-center"
        >
          <MarkeeFace size={320} />
          <div className="mt-4 text-center text-xs uppercase tracking-[0.22em] text-[color:var(--muted-foreground)]">
            Oi, eu sou a Markee
          </div>
        </motion.div>
      </div>

      <div className="mt-16 grid gap-4 sm:grid-cols-3">
        {[
          {
            t: "Agenda 24/7",
            d: "Seus clientes marcam, remarcam e cancelam sozinhos — a qualquer hora.",
          },
          {
            t: "Lembretes automáticos",
            d: "Reduza faltas com confirmações e lembretes via WhatsApp e e-mail.",
          },
          {
            t: "Sua marca, do seu jeito",
            d: "Cores, logo e textos personalizados pra cara do seu negócio.",
          },
        ].map((f) => (
          <div key={f.t} className="markee-glass p-5">
            <div className="markee-display text-lg font-semibold">{f.t}</div>
            <div className="mt-1 text-sm text-[color:var(--muted-foreground)]">{f.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
