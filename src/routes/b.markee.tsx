import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { MarkeeFace } from "@/components/markee/MarkeeFace";

export const Route = createFileRoute("/b/markee")({
  component: MarkeeLayout,
  head: () => ({
    meta: [
      { title: "Markee — Agenda inteligente, sem complicação" },
      {
        name: "description",
        content:
          "Onboarding Markee: 7 dias grátis, sem cartão de crédito. Configure sua agenda automatizada em minutos.",
      },
    ],
  }),
});

function MarkeeLayout() {
  return (
    <div className="markee-theme min-h-screen relative overflow-x-hidden">
      {/* fundo galáctico */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1200px 600px at 20% -10%, oklch(0.30 0.10 295 / 0.55), transparent 60%), radial-gradient(900px 500px at 110% 10%, oklch(0.30 0.10 220 / 0.45), transparent 60%), radial-gradient(800px 600px at 50% 110%, oklch(0.25 0.08 280 / 0.4), transparent 60%)",
        }}
      />
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Link
          to="/b/$slug"
          params={{ slug: "markee" }}
          className="flex items-center gap-2.5"
        >
          <MarkeeFace size={40} />
          <span className="markee-display text-xl font-semibold tracking-tight">
            markee<span className="markee-grad-text">.ai</span>
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          <Link
            to="/b/$slug/acompanhamento"
            params={{ slug: "markee" }}
            className="markee-ghost hidden sm:inline-flex text-sm"
          >
            Acompanhar chamado
          </Link>
          <Link
            to="/b/$slug/comecar"
            params={{ slug: "markee" }}
            className="markee-cta text-sm"
          >
            Começar
          </Link>
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-8">
        <Outlet />
      </main>
      <footer className="mx-auto w-full max-w-6xl px-5 py-8 text-xs text-[color:var(--muted-foreground)] md:px-8">
        © {new Date().getFullYear()} Markee — agenda inteligente para o seu negócio.
      </footer>
    </div>
  );
}
