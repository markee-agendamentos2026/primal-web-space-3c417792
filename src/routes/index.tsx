import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Smartphone, 
  LayoutDashboard, 
  Users 
} from "lucide-react";
import { motion } from "framer-motion";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold tracking-tight">Markee</span>
          </div>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">Funcionalidades</a>
            <a href="#about" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">Sobre</a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground transition hover:text-foreground">Preços</a>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/auth/signup">
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">Começar Grátis</Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pb-20 pt-32 lg:pt-48">
          <div className="absolute -top-24 left-1/2 h-[500px] w-[800px] -translate-x-1/2 bg-primary/20 blur-[120px]" />
          <div className="container relative mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mx-auto mb-6 flex max-w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1 backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-medium uppercase tracking-wider text-primary">Novo: Inteligência em Agendamentos</span>
              </div>
              <h1 className="mx-auto max-w-4xl font-display text-5xl font-black tracking-tight sm:text-7xl">
                O ponto central da sua{" "}
                <span className="bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  operação de serviço
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
                Uma experiência premium, intuitiva e totalmente mobile-first para gerenciar sua agenda, equipe e clientes em um só lugar.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/auth/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="h-12 w-full px-8 text-base sm:w-auto">
                    Experimentar Agora <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auth/login" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="h-12 w-full px-8 text-base border-white/10 sm:w-auto">
                    Ver Demonstração
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* App Preview Mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="mt-20 flex justify-center"
            >
              <div className="relative max-w-5xl rounded-2xl border border-white/10 bg-white/5 p-2 shadow-2xl backdrop-blur-sm">
                <div className="overflow-hidden rounded-xl border border-white/5 bg-zinc-950">
                  <img 
                    src="https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=2000&auto=format&fit=crop" 
                    alt="Interface Markee" 
                    className="h-auto w-full opacity-50 grayscale hover:grayscale-0 transition duration-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="rounded-full bg-white/10 p-4 backdrop-blur-xl border border-white/20">
                      <LayoutDashboard className="h-12 w-12 text-primary" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-24">
          <div className="container mx-auto px-4">
            <div className="mb-16 text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Tudo o que você precisa para crescer</h2>
              <p className="mt-4 text-muted-foreground">Simples para o cliente, poderoso para você.</p>
            </div>

            <div className="grid gap-8 md:grid-cols-3">
              {[
                {
                  title: "Mobile First",
                  desc: "Desenvolvido para funcionar perfeitamente em celulares, onde seus clientes estão.",
                  icon: <Smartphone className="h-6 w-6 text-primary" />
                },
                {
                  title: "Multi-Tenant SaaS",
                  desc: "Sua empresa, seus dados, sua marca. Isolamento total e segurança de nível bancário.",
                  icon: <CheckCircle2 className="h-6 w-6 text-primary" />
                },
                {
                  title: "Gestão de Equipe",
                  desc: "Controle escalas, serviços e produtividade dos seus profissionais em tempo real.",
                  icon: <Users className="h-6 w-6 text-primary" />
                }
              ].map((f, i) => (
                <div key={i} className="group rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition hover:border-primary/20 hover:bg-white/[0.04]">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition">
                    {f.icon}
                  </div>
                  <h3 className="mb-2 font-display text-xl font-bold">{f.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-12">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-6 flex items-center justify-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-display font-bold tracking-tight">Markee</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 Markee SaaS. A nova era da gestão de agendamentos.</p>
        </div>
      </footer>
    </div>
  );
}
