import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export const Route = createFileRoute("/b/markee/")({
  component: MarkeeHome,
});

function MarkeeHome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-neutral-950 text-white selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-neutral-950/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="text-xl font-bold tracking-tighter">MARKEE</div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-sm font-medium hover:bg-white/5"
              onClick={() => navigate({ to: "/b/markee/tracking" })}
            >
              Acompanhar Chamado
            </Button>
            <Button
              className="rounded-full bg-white px-6 text-sm font-semibold text-black hover:bg-neutral-200 transition-all duration-300"
              onClick={() => navigate({ to: "/b/markee/onboarding" })}
            >
              Começar Grátis
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pt-20">
        {/* Background Gradients */}
        <div className="absolute top-0 -z-10 h-full w-full overflow-hidden">
          <div className="absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]" />
          <div className="absolute left-[30%] top-[20%] h-[300px] w-[300px] rounded-full bg-blue-500/10 blur-[100px]" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl text-center"
        >
          <h1 className="text-5xl font-bold tracking-tight sm:text-7xl">
            Gestão inteligente para o seu negócio premium
          </h1>
          <p className="mx-auto mt-8 max-w-2xl text-lg text-neutral-400 sm:text-xl">
            A plataforma multi-tenant definitiva para agendamentos e gestão. 
            Elegância, performance e exclusividade em um só lugar.
          </p>
          
          <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              className="h-14 rounded-full bg-white px-8 text-base font-semibold text-black hover:bg-neutral-200"
              onClick={() => navigate({ to: "/b/markee/onboarding" })}
            >
              Começar agora
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-14 rounded-full border-white/10 px-8 text-base font-medium hover:bg-white/5"
              onClick={() => navigate({ to: "/b/markee/tracking" })}
            >
              Acompanhar chamado
            </Button>
          </div>
        </motion.div>

        {/* Feature Preview / Image Placeholder */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="mt-20 w-full max-w-5xl rounded-2xl border border-white/5 bg-gradient-to-b from-white/10 to-transparent p-4 backdrop-blur-sm"
        >
          <div className="aspect-[16/9] w-full rounded-xl bg-neutral-900 overflow-hidden relative">
            <div className="absolute inset-0 flex items-center justify-center text-neutral-700 font-medium">
               Visualização do Sistema
            </div>
            {/* Minimal UI elements as decoration */}
            <div className="absolute top-4 left-4 right-4 flex gap-2">
               <div className="h-2 w-2 rounded-full bg-white/20" />
               <div className="h-2 w-2 rounded-full bg-white/20" />
               <div className="h-2 w-2 rounded-full bg-white/20" />
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
