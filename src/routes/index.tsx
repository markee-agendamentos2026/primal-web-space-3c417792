import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  Smartphone, 
  LayoutDashboard, 
  Users,
  Zap,
  ShieldCheck,
  Globe,
  Star,
  ChevronDown
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-primary/30 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary shadow-[0_0_20px_rgba(212,166,74,0.3)]">
              <Sparkles className="h-5 w-5 text-black" />
            </div>
            <span className="font-display text-2xl font-bold tracking-tight">Markee</span>
          </div>
          
          <div className="hidden items-center gap-8 md:flex">
            {["Funcionalidades", "Soluções", "Preços", "Sobre"].map((item) => (
              <a 
                key={item} 
                href={`#${item.toLowerCase()}`} 
                className="text-sm font-medium text-zinc-400 transition hover:text-white"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link to="/auth/login" className="hidden sm:block">
              <Button variant="ghost" className="text-zinc-400 hover:text-white hover:bg-white/5">Entrar</Button>
            </Link>
            <Link to="/auth/signup">
              <Button className="bg-white text-black hover:bg-zinc-200 font-bold px-6 rounded-full transition-all hover:scale-105 active:scale-95">
                Começar Grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pb-20 pt-32 lg:pb-32 lg:pt-48">
          {/* Animated Background Elements */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-7xl pointer-events-none">
            <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-primary/10 blur-[120px] animate-pulse" />
            <div className="absolute bottom-[10%] right-[-10%] h-[400px] w-[400px] rounded-full bg-primary/5 blur-[100px]" />
          </div>

          <div className="container relative mx-auto px-4 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mx-auto mb-8 flex max-w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-primary" />
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">Plataforma SaaS Premium</span>
              </div>
              
              <h1 className="mx-auto max-w-5xl font-display text-5xl font-black tracking-tight sm:text-7xl lg:text-8xl">
                Agendamento para quem{" "}
                <span className="bg-gradient-to-b from-primary to-primary/60 bg-clip-text text-transparent">
                  valoriza o tempo.
                </span>
              </h1>
              
              <p className="mx-auto mt-8 max-w-2xl text-lg text-zinc-400 leading-relaxed md:text-xl">
                A Markee é o sistema operacional para negócios de serviços modernos. 
                Uma experiência mobile-first inspirada em gigantes como Linear e Stripe.
              </p>

              <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link to="/auth/signup" className="w-full sm:w-auto">
                  <Button size="lg" className="h-14 w-full bg-primary text-black hover:bg-primary/90 px-10 text-lg font-bold rounded-full transition-all hover:shadow-[0_0_30px_rgba(212,166,74,0.4)]">
                    Criar minha conta <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <button className="group flex items-center gap-2 text-zinc-400 hover:text-white transition-colors py-3 px-6">
                  <span className="font-semibold text-lg">Ver Demo</span>
                  <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-primary/50 group-hover:bg-primary/5 transition-all">
                    <Zap className="h-4 w-4" />
                  </div>
                </button>
              </div>

              {/* Social Proof / Stats */}
              <div className="mt-16 flex flex-wrap justify-center gap-8 opacity-40 grayscale transition hover:opacity-70 hover:grayscale-0 duration-700">
                {["Airbnb", "Stripe", "Linear", "Notion"].map(brand => (
                  <span key={brand} className="font-display text-2xl font-bold tracking-tighter">{brand}</span>
                ))}
              </div>
            </motion.div>

            {/* App Preview Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="mt-24 relative"
            >
              <div className="absolute inset-0 bg-primary/20 blur-[150px] -z-10 h-3/4 mt-20" />
              <div className="mx-auto max-w-6xl rounded-3xl border border-white/10 bg-zinc-900/50 p-3 shadow-2xl backdrop-blur-sm">
                <div className="aspect-[16/9] overflow-hidden rounded-2xl border border-white/5 bg-black relative">
                  <div className="absolute top-0 left-0 w-full h-8 bg-zinc-900 flex items-center px-4 gap-2">
                    <div className="h-2 w-2 rounded-full bg-zinc-700" />
                    <div className="h-2 w-2 rounded-full bg-zinc-700" />
                    <div className="h-2 w-2 rounded-full bg-zinc-700" />
                  </div>
                  <div className="p-8 pt-12 text-left h-full flex flex-col justify-between">
                    <div className="grid grid-cols-12 gap-6 h-full">
                      <div className="col-span-3 border-r border-white/5 space-y-4 pr-4">
                        <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
                        <div className="h-4 w-3/4 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-4 w-full bg-zinc-800 rounded animate-pulse" />
                      </div>
                      <div className="col-span-9 space-y-6">
                        <div className="flex justify-between items-center">
                          <div className="h-8 w-48 bg-zinc-800 rounded animate-pulse" />
                          <div className="h-8 w-8 bg-primary rounded animate-pulse" />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {[1,2,3].map(i => (
                            <div key={i} className="h-32 bg-zinc-900 border border-white/5 rounded-xl p-4 space-y-2">
                               <div className="h-2 w-1/2 bg-zinc-800 rounded" />
                               <div className="h-4 w-full bg-zinc-800 rounded" />
                            </div>
                          ))}
                        </div>
                        <div className="h-48 bg-zinc-900/50 border border-dashed border-white/10 rounded-xl flex items-center justify-center text-zinc-700 font-display">
                           Dashboard Preview
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Grid */}
        <section id="funcionalidades" className="py-24 border-t border-white/5 bg-zinc-950">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center mb-20 text-center">
              <span className="text-primary text-sm font-bold tracking-[0.3em] uppercase mb-4">Potência Incomparável</span>
              <h2 className="font-display text-4xl font-bold tracking-tight sm:text-6xl max-w-3xl">
                O futuro da gestão de serviços já chegou.
              </h2>
            </div>

            <div className="grid gap-px bg-white/5 rounded-3xl overflow-hidden md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Mobile First DNA",
                  desc: "Tudo nasce no celular. Uma experiência nativa em qualquer navegador mobile.",
                  icon: <Smartphone className="h-8 w-8" />
                },
                {
                  title: "Arquitetura Multi-Tenant",
                  desc: "Isolamento total de dados para sua empresa. Segurança e privacidade em primeiro lugar.",
                  icon: <ShieldCheck className="h-8 w-8" />
                },
                {
                  title: "Portal do Cliente",
                  desc: "Agendamento em segundos, sem fricção, sem senhas complicadas.",
                  icon: <Globe className="h-8 w-8" />
                },
                {
                  title: "Agenda Inteligente",
                  desc: "Visualização por dia, semana ou mês com timeline fluida tipo Google Calendar.",
                  icon: <Calendar className="h-8 w-8" />
                },
                {
                  title: "Gestão Financeira",
                  desc: "Fluxo de caixa, comissões e relatórios automáticos. Tudo na palma da mão.",
                  icon: <LayoutDashboard className="h-8 w-8" />
                },
                {
                  title: "Ecossistema Markee",
                  desc: "Prepare-se para IA, CRM e Marketplace em uma única plataforma integrada.",
                  icon: <Sparkles className="h-8 w-8" />
                }
              ].map((f, i) => (
                <div key={i} className="bg-black p-10 group transition-all hover:bg-zinc-900/50">
                  <div className="mb-6 text-primary transition-transform group-hover:scale-110 duration-500">
                    {f.icon}
                  </div>
                  <h3 className="mb-4 font-display text-2xl font-bold">{f.title}</h3>
                  <p className="text-zinc-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonial / Social Proof */}
        <section className="py-24 bg-black relative overflow-hidden">
          <div className="container mx-auto px-4">
             <div className="max-w-4xl mx-auto border border-white/10 bg-zinc-900/30 rounded-[40px] p-12 text-center relative">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 h-20 w-20 bg-primary rounded-full flex items-center justify-center text-black">
                  <Star className="h-10 w-10 fill-current" />
                </div>
                <blockquote className="font-display text-3xl md:text-4xl italic font-medium leading-tight">
                  "Finalmente encontrei um sistema moderno. A Markee transformou a forma como gerencio meu estúdio, trazendo a sofisticação que meus clientes esperam."
                </blockquote>
                <cite className="mt-10 not-italic block">
                  <span className="text-xl font-bold text-white">Ronielson Hair</span>
                  <span className="text-primary block text-sm font-bold uppercase tracking-widest mt-1">Master Barber & Founder</span>
                </cite>
             </div>
          </div>
        </section>

        {/* Pricing CTA */}
        <section id="preços" className="py-24 bg-black">
          <div className="container mx-auto px-4 text-center">
            <h2 className="font-display text-5xl font-bold mb-8">Pronto para elevar seu negócio?</h2>
            <p className="text-zinc-400 mb-12 max-w-xl mx-auto text-lg">
              Comece agora mesmo com nosso plano gratuito e descubra por que a Markee é a escolha dos negócios premium.
            </p>
            <Link to="/auth/signup">
              <Button size="lg" className="h-16 px-12 text-xl font-black bg-white text-black hover:bg-zinc-200 rounded-full">
                Começar Teste Gratuito
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/5 py-20 bg-black">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-20">
            <div className="col-span-2">
               <div className="flex items-center gap-2 mb-6">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <Sparkles className="h-5 w-5 text-black" />
                </div>
                <span className="font-display text-2xl font-bold tracking-tight">Markee</span>
              </div>
              <p className="text-zinc-500 max-w-xs">
                A nova era da gestão de agendamentos. Premium por design, potente por natureza.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6">Produto</h4>
              <ul className="space-y-4 text-zinc-500 text-sm">
                <li><a href="#" className="hover:text-white transition">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-white transition">Agenda</a></li>
                <li><a href="#" className="hover:text-white transition">Financeiro</a></li>
              </ul>
            </div>
            <div>
               <h4 className="font-bold mb-6">Empresa</h4>
              <ul className="space-y-4 text-zinc-500 text-sm">
                <li><a href="#" className="hover:text-white transition">Sobre nós</a></li>
                <li><a href="#" className="hover:text-white transition">Carreiras</a></li>
                <li><a href="#" className="hover:text-white transition">Contato</a></li>
              </ul>
            </div>
            <div>
               <h4 className="font-bold mb-6">Legal</h4>
              <ul className="space-y-4 text-zinc-500 text-sm">
                <li><a href="#" className="hover:text-white transition">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition">Termos</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-zinc-600">© 2026 Markee SaaS. Todos os direitos reservados.</p>
            <div className="flex gap-8 opacity-40">
               <span className="text-xs font-bold uppercase tracking-widest">Built for the future</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
