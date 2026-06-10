import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Star, Zap, Crown, ArrowRight, Play, Shield, MousePointer2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/b/markee/")({
  component: MarkeeHome,
});

function MarkeeHome() {
  const navigate = useNavigate();

  const plans = [
    {
      name: "Básico",
      price: "R$ 49/mês",
      description: "Ideal para profissionais liberais começando sua jornada digital.",
      image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?auto=format&fit=crop&q=80&w=400&h=300",
      emoji: "🌱",
      icon: Zap,
      features: ["Até 50 agendamentos/mês", "Agenda digital básica", "Notificações por e-mail", "Suporte via chat"],
      color: "from-blue-500/10 to-transparent",
    },
    {
      name: "Pro",
      price: "R$ 99/mês",
      description: "A escolha perfeita para clínicas e estúdios em crescimento constante.",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400&h=300",
      emoji: "🚀",
      icon: Star,
      features: ["Agendamentos ilimitados", "Lembretes via WhatsApp", "Gestão de equipe", "Relatórios financeiros", "Suporte prioritário"],
      color: "from-primary/20 to-transparent",
      popular: true,
    },
    {
      name: "Premium",
      price: "R$ 199/mês",
      description: "Experiência completa com IA e personalização total para o seu negócio.",
      image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&q=80&w=400&h=300",
      emoji: "💎",
      icon: Crown,
      features: ["Tudo do Pro", "App personalizado (PWA)", "Automação com IA", "API de integração", "Gerente de conta dedicado"],
      color: "from-purple-500/20 to-transparent",
    },
  ];

  const handleStart = () => navigate({ to: "/b/markee/onboarding" });

  return (
    <div className="min-h-screen bg-[#020202] text-white selection:bg-primary/30 font-sans selection:text-black">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/[0.05] bg-black/40 backdrop-blur-2xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-4 group cursor-pointer">
            <div className="relative flex h-14 w-14 items-center justify-center">
              {/* Outer Life Ring - Rotating Power */}
              <div className="absolute inset-0 rounded-full border-2 border-primary/10" />
              <motion.div 
                className="absolute inset-0 rounded-full border-t-2 border-r-2 border-primary shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]"
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              />
              <motion.div 
                className="absolute inset-2 rounded-full border-b-2 border-l-2 border-blue-400/30"
                animate={{ rotate: -360 }}
                transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              />
              
              {/* The AI Face / Core */}
              <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-black border border-white/10 overflow-hidden shadow-inner">
                {/* AI "Eyes" or Face features */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_70%)] opacity-30" />
                
                {/* Visualizing a Face */}
                <div className="flex flex-col items-center gap-1.5 z-10">
                  <div className="flex gap-2">
                    <motion.div 
                      className="h-1 w-2.5 rounded-full bg-primary"
                      animate={{ scaleY: [1, 0.1, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 3, repeat: Infinity, times: [0, 0.1, 0.2] }}
                    />
                    <motion.div 
                      className="h-1 w-2.5 rounded-full bg-primary"
                      animate={{ scaleY: [1, 0.1, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 3, repeat: Infinity, times: [0, 0.1, 0.2] }}
                    />
                  </div>
                  <motion.div 
                    className="h-0.5 w-4 rounded-full bg-primary/60"
                    animate={{ width: ["1rem", "1.2rem", "1rem"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tighter bg-gradient-to-r from-white via-white/90 to-primary bg-clip-text text-transparent italic leading-none">
                Markee
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary/80 leading-none mt-1">
                Living AI Agent
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative pt-32 pb-24 overflow-hidden">
        {/* Abstract Background Elements */}
        <div className="absolute top-0 -z-10 h-full w-full pointer-events-none overflow-hidden">
          <div className="absolute left-[-10%] top-[-10%] h-[1000px] w-[1000px] rounded-full bg-primary/5 blur-[150px] animate-pulse" />
          <div className="absolute right-[-5%] top-[20%] h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-[120px]" />
          <div className="absolute left-[20%] bottom-0 h-[800px] w-[800px] rounded-full bg-purple-500/5 blur-[180px]" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay" />
        </div>

        <section className="px-6 relative">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-center text-center lg:items-start lg:text-left grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
                className="relative z-10"
              >
                <motion.div 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-primary/90"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                  </span>
                  Experiência de Próxima Geração
                </motion.div>
                
                <h1 className="mt-8 text-6xl font-black tracking-tight leading-[1] sm:text-7xl lg:text-8xl xl:text-9xl">
                  A Arte de <br />
                  <span className="relative inline-block mt-2">
                    <span className="bg-gradient-to-r from-primary via-white to-primary bg-[length:200%_auto] animate-gradient-text bg-clip-text text-transparent italic">
                      Agendar
                    </span>
                    <motion.div 
                      className="absolute -bottom-2 left-0 h-1 bg-primary/50 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ delay: 1, duration: 1 }}
                    />
                  </span>
                </h1>
                
                <p className="mt-10 max-w-xl text-xl text-neutral-400 leading-relaxed font-light">
                  Transforme seu negócio com uma plataforma que respira sofisticação. 
                  Sincronização impecável, design intuitivo e a exclusividade que sua marca merece.
                </p>
                
                <div className="mt-14 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                  <Button
                    size="lg"
                    className="h-16 w-full sm:w-auto rounded-2xl bg-primary px-10 text-lg font-black text-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_20px_40px_-15px_rgba(var(--primary-rgb),0.3)] group overflow-hidden relative"
                    onClick={handleStart}
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      Começar grátis por 7 dias
                      <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                    </span>
                    <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity" />
                  </Button>
                  
                  <button
                    className="group flex items-center gap-4 text-white hover:text-primary transition-colors font-semibold"
                    onClick={() => navigate({ to: "/b/markee/tracking" })}
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-all group-hover:border-primary/50 group-hover:bg-primary/10">
                      <Play className="h-6 w-6 fill-current ml-1" />
                    </div>
                    <span>Acompanhar chamado</span>
                  </button>
                </div>

                <div className="mt-16 flex items-center gap-8 grayscale opacity-40 hover:grayscale-0 hover:opacity-100 transition-all duration-700 overflow-hidden py-4 border-y border-white/5">
                  <Shield className="h-8 w-8" />
                  <MousePointer2 className="h-8 w-8" />
                  <div className="h-4 w-px bg-white/10" />
                  <span className="text-sm font-bold tracking-widest uppercase">Trusted by 200+ Premium Brands</span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ duration: 1, delay: 0.4 }}
                className="relative hidden lg:block"
              >
                {/* Floating UI Elements */}
                <div className="relative z-10 space-y-8">
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="rounded-3xl border border-white/10 bg-black/40 p-8 backdrop-blur-2xl shadow-2xl mr-12 hover:border-primary/30 transition-colors"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="h-3 w-3 rounded-full bg-red-500" />
                      <div className="h-3 w-3 rounded-full bg-yellow-500" />
                      <div className="h-3 w-3 rounded-full bg-green-500" />
                    </div>
                    <p className="text-2xl font-light italic text-neutral-200 leading-tight">
                      "A Markee elevou nossa clínica ao status de referência em experiência do cliente."
                    </p>
                    <div className="mt-6 flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-primary to-blue-500" />
                      <div>
                        <p className="font-bold text-sm">Mariana Silva</p>
                        <p className="text-xs text-neutral-500 font-medium">CEO @ Studio Luxury</p>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div 
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 backdrop-blur-xl ml-12 shadow-xl border-l-primary/30 border-l-4"
                  >
                    <div className="flex justify-between items-center mb-2">
                       <span className="text-xs font-bold text-neutral-500 uppercase">Growth Insights</span>
                       <Zap className="h-4 w-4 text-primary" />
                    </div>
                    <p className="text-3xl font-black text-white">+42%</p>
                    <p className="text-sm text-neutral-400 font-medium">Aumento na retenção mensal</p>
                  </motion.div>
                </div>

                {/* Decorative Circles */}
                <div className="absolute -top-20 -right-20 h-64 w-64 bg-primary/10 rounded-full blur-[80px]" />
                <div className="absolute -bottom-20 -left-20 h-64 w-64 bg-blue-500/10 rounded-full blur-[80px]" />
              </motion.div>
            </div>
          </div>
        </section>

        {/* Plans Section */}
        <section className="mt-52 px-6 relative" id="plans">
          <div className="mx-auto max-w-7xl">
            <div className="flex flex-col items-center text-center space-y-4 mb-20">
              <span className="text-primary font-black tracking-widest uppercase text-xs">Planos & Investimento</span>
              <h2 className="text-5xl font-black sm:text-7xl italic">Nossos Planos</h2>
              <div className="h-1.5 w-24 bg-primary rounded-full" />
              <p className="mt-4 text-xl text-neutral-400 max-w-2xl font-light">
                Escolha a escala ideal para o seu sucesso. Comece pequeno, cresça sem limites.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className={`relative h-full overflow-hidden border-white/[0.08] bg-neutral-900/40 backdrop-blur-xl transition-all duration-700 hover:border-primary/40 hover:translate-y-[-12px] group flex flex-col rounded-[2rem]`}>
                    <div className={`absolute inset-0 bg-gradient-to-br ${plan.color} opacity-40 group-hover:opacity-60 transition-opacity`} />
                    
                    {plan.popular && (
                      <div className="absolute right-0 top-0 rounded-bl-3xl bg-primary px-6 py-2 text-[10px] font-black text-black uppercase tracking-[0.2em]">
                        Most Popular Choice
                      </div>
                    )}

                    <CardHeader className="relative pt-12 px-8">
                      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-[2rem] bg-white/[0.03] text-4xl border border-white/5 shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:bg-white/[0.07] group-hover:rotate-6">
                        {plan.emoji}
                      </div>
                      <div className="flex items-center gap-3">
                        <plan.icon className="h-6 w-6 text-primary group-hover:animate-pulse" />
                        <CardTitle className="text-3xl font-black italic tracking-tight">{plan.name}</CardTitle>
                      </div>
                      <CardDescription className="mt-4 text-neutral-400 text-lg font-light leading-relaxed min-h-[56px]">
                        {plan.description}
                      </CardDescription>
                      <div className="mt-8">
                        <span className="text-5xl font-black text-white tracking-tighter">{plan.price}</span>
                        <span className="text-neutral-500 text-sm font-medium ml-2 uppercase tracking-widest">/ billed monthly</span>
                      </div>
                    </CardHeader>

                    <CardContent className="relative space-y-8 px-8 flex-grow">
                      <div className="my-8 aspect-[16/10] w-full overflow-hidden rounded-3xl border border-white/5 relative group-hover:border-primary/20 transition-colors">
                        <img 
                          src={plan.image} 
                          alt={plan.name} 
                          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110 group-hover:rotate-1"
                        />
                        <div className="absolute inset-0 bg-black/20" />
                      </div>
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.2em] mb-4">What's included</p>
                        {plan.features.map((feature) => (
                          <div key={feature} className="flex items-start gap-4 text-base text-neutral-300 font-medium group/item">
                            <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover/item:bg-primary/20">
                              <Check className="h-3 w-3 text-primary" />
                            </div>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter className="relative pb-10 pt-8 px-8">
                      <Button 
                        className="w-full h-16 rounded-2xl bg-white font-black text-black text-lg transition-all duration-500 hover:bg-primary active:scale-95 group-hover:shadow-[0_15px_30px_-10px_rgba(var(--primary-rgb),0.2)]"
                        onClick={handleStart}
                      >
                        Começar grátis por 7 dias
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Elevated Footer CTA */}
        <section className="mt-60 px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-6xl rounded-[3rem] border border-white/10 bg-gradient-to-b from-white/[0.03] to-transparent p-12 text-center backdrop-blur-3xl md:p-24 relative overflow-hidden group"
          >
            {/* Background pattern */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(circle_at_center,white_1px,transparent_1px)] bg-[size:40px_40px]" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
            
            <h2 className="text-5xl font-black tracking-tight md:text-8xl italic leading-none">
              Pronto para <br />
              <span className="text-primary">Elevar</span> o Nível?
            </h2>
            <p className="mx-auto mt-8 max-w-2xl text-xl text-neutral-400 font-light leading-relaxed">
              Junte-se a uma comunidade de negócios visionários que já descobriram o poder da 
              Markee. Design, automação e elegância em cada clique.
            </p>
            <Button
              size="lg"
              className="mt-12 h-20 rounded-3xl bg-primary px-16 text-2xl font-black text-black hover:scale-105 active:scale-95 transition-all shadow-[0_30px_60px_-15px_rgba(var(--primary-rgb),0.4)] relative z-10"
              onClick={handleStart}
            >
              Começar grátis por 7 dias
            </Button>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/[0.03] bg-[#020202] py-20 px-6">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2">
              <div className="flex items-center gap-4 mb-6">
                <div className="relative flex h-12 w-12 items-center justify-center">
                  <div className="absolute inset-0 rounded-full border border-primary/20 animate-spin-slow" />
                  <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-black border border-white/20">
                    <div className="flex gap-1">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <div className="h-1 w-1 rounded-full bg-primary" />
                    </div>
                  </div>
                </div>
                <span className="text-2xl font-black italic tracking-tight">Markee AI</span>
              </div>
              <p className="text-neutral-500 max-w-xs text-lg font-light leading-relaxed">
                A inteligência artificial definitiva para agendamentos premium e gestão de fluxo.
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-neutral-300">Plataforma</h4>
              <ul className="space-y-4 text-neutral-500 font-medium">
                <li><a href="#" className="hover:text-primary transition-colors">Funcionalidades</a></li>
                <li><a href="#plans" className="hover:text-primary transition-colors">Planos</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Enterprise</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold mb-6 uppercase tracking-widest text-xs text-neutral-300">Suporte</h4>
              <ul className="space-y-4 text-neutral-500 font-medium">
                <li><a href="#" className="hover:text-primary transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Status</a></li>
                <li><a href="#" className="hover:text-primary transition-colors">Contato</a></li>
              </ul>
            </div>
          </div>
          <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-10 border-t border-white/[0.03] text-neutral-600 text-sm font-medium">
            <span>© 2026 Markee Agendamentos. Crafted with Precision.</span>
            <div className="flex gap-10">
              <a href="#" className="hover:text-white transition-colors tracking-widest uppercase text-[10px] font-black">Termos de Uso</a>
              <a href="#" className="hover:text-white transition-colors tracking-widest uppercase text-[10px] font-black">Privacidade</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}


