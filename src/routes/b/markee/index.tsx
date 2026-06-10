import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Check, Star, Zap, Crown } from "lucide-react";
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
      color: "from-blue-500/10 to-blue-600/5",
    },
    {
      name: "Pro",
      price: "R$ 99/mês",
      description: "A escolha perfeita para clínicas e estúdios em crescimento constante.",
      image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=400&h=300",
      emoji: "🚀",
      icon: Star,
      features: ["Agendamentos ilimitados", "Lembretes via WhatsApp", "Gestão de equipe", "Relatórios financeiros", "Suporte prioritário"],
      color: "from-primary/20 to-primary/5",
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
      color: "from-purple-500/20 to-purple-600/5",
    },
  ];

  const handleStart = () => navigate({ to: "/b/markee/onboarding" });

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-primary/30 font-sans">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-black/60 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]">
              <span className="text-xl font-black text-black">M</span>
            </div>
            <span className="text-2xl font-bold tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              Markee Agendamentos
            </span>
          </div>
          {/* Botões comentados conforme solicitado */}
          {/* <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              className="text-sm font-medium hover:bg-white/5 text-neutral-400"
              onClick={() => navigate({ to: "/b/markee/tracking" })}
            >
              Acompanhar Chamado
            </Button>
            <Button
              className="rounded-full bg-white px-6 text-sm font-semibold text-black hover:bg-neutral-200 transition-all duration-300"
              onClick={handleStart}
            >
              Começar Grátis
            </Button>
          </div> */}
        </div>
      </nav>

      <main className="relative pt-32 pb-24">
        {/* Background Gradients */}
        <div className="absolute top-0 -z-10 h-full w-full overflow-hidden pointer-events-none">
          <div className="absolute left-1/2 top-0 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary/10 blur-[120px]" />
          <div className="absolute right-0 top-[20%] h-[400px] w-[400px] rounded-full bg-blue-500/5 blur-[100px]" />
        </div>

        <section className="px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8 }}
              >
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm font-medium text-primary">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
                  </span>
                  Lançamento Oficial v2.0
                </div>
                <h1 className="mt-8 text-6xl font-extrabold tracking-tight leading-[1.1] sm:text-7xl lg:text-8xl">
                  Transforme seu <br />
                  <span className="bg-gradient-to-r from-primary via-white to-primary bg-[length:200%_auto] animate-gradient-text bg-clip-text text-transparent">
                    Agendamento
                  </span>
                </h1>
                <p className="mt-8 max-w-xl text-xl text-neutral-400 leading-relaxed">
                  A plataforma multi-tenant definitiva que une elegância, 
                  performance e exclusividade para negócios que não aceitam o comum.
                </p>
                
                <div className="mt-12 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <Button
                    size="lg"
                    className="h-16 w-full sm:w-auto rounded-2xl bg-primary px-10 text-lg font-bold text-black hover:scale-105 transition-all shadow-[0_0_30px_rgba(var(--primary-rgb),0.2)]"
                    onClick={handleStart}
                  >
                    Começar grátis por 7 dias
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="h-16 w-full sm:w-auto rounded-2xl border-white/10 bg-white/5 px-10 text-lg font-semibold hover:bg-white/10 transition-all"
                    onClick={() => navigate({ to: "/b/markee/tracking" })}
                  >
                    Acompanhar chamado
                  </Button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="relative hidden lg:block"
              >
                <div className="space-y-6 text-right">
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 backdrop-blur-md">
                    <p className="text-2xl font-medium italic text-neutral-200">
                      "A Markee mudou completamente como gerencio meus clientes VIP."
                    </p>
                    <p className="mt-4 font-bold text-primary">— Studio Luxury</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 backdrop-blur-md mr-12">
                    <p className="text-xl font-medium text-neutral-300">
                      Eficiência que se traduz em faturamento.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 to-transparent p-6 backdrop-blur-md mr-4">
                    <p className="text-lg font-medium text-neutral-400">
                      Design que reflete o valor da sua marca.
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* Plans Section */}
        <section className="mt-40 px-6" id="plans">
          <div className="mx-auto max-w-7xl">
            <div className="text-center">
              <h2 className="text-4xl font-bold sm:text-5xl">Nossos Planos</h2>
              <p className="mt-4 text-lg text-neutral-400">Escolha a escala ideal para o seu sucesso</p>
            </div>

            <div className="mt-20 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.name}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card className={`relative h-full overflow-hidden border-white/10 bg-neutral-900/50 backdrop-blur-sm transition-all duration-500 hover:border-primary/50 hover:translate-y-[-8px] group`}>
                    <div className={`absolute inset-0 bg-gradient-to-b ${plan.color} opacity-50`} />
                    
                    {plan.popular && (
                      <div className="absolute right-0 top-0 rounded-bl-2xl bg-primary px-4 py-1 text-xs font-bold text-black uppercase tracking-wider">
                        Mais Popular
                      </div>
                    )}

                    <CardHeader className="relative pt-8">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 text-3xl group-hover:scale-110 transition-transform">
                        {plan.emoji}
                      </div>
                      <div className="flex items-center gap-2">
                        <plan.icon className="h-5 w-5 text-primary" />
                        <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                      </div>
                      <CardDescription className="mt-2 text-neutral-400 min-h-[48px]">
                        {plan.description}
                      </CardDescription>
                      <div className="mt-6">
                        <span className="text-4xl font-black text-white">{plan.price}</span>
                      </div>
                    </CardHeader>

                    <CardContent className="relative space-y-4">
                      <div className="my-6 aspect-video w-full overflow-hidden rounded-xl border border-white/10">
                        <img 
                          src={plan.image} 
                          alt={plan.name} 
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                        />
                      </div>
                      <div className="space-y-3">
                        {plan.features.map((feature) => (
                          <div key={feature} className="flex items-center gap-3 text-sm text-neutral-300">
                            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20">
                              <Check className="h-3.5 w-3.5 text-primary" />
                            </div>
                            {feature}
                          </div>
                        ))}
                      </div>
                    </CardContent>

                    <CardFooter className="relative pb-8 pt-4">
                      <Button 
                        className="w-full h-12 rounded-xl bg-white font-bold text-black hover:bg-neutral-200 transition-colors group-hover:bg-primary"
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

        {/* Footer CTA */}
        <section className="mt-40 px-6">
          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mx-auto max-w-5xl rounded-[2.5rem] border border-white/10 bg-gradient-to-b from-white/5 to-transparent p-12 text-center backdrop-blur-xl md:p-24"
          >
            <h2 className="text-4xl font-bold tracking-tight md:text-6xl">
              Pronto para elevar o nível?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-neutral-400">
              Junte-se a centenas de negócios que já transformaram sua gestão com a Markee.
            </p>
            <Button
              size="lg"
              className="mt-10 h-16 rounded-2xl bg-primary px-12 text-xl font-bold text-black hover:scale-105 transition-all shadow-[0_0_40px_rgba(var(--primary-rgb),0.3)]"
              onClick={handleStart}
            >
              Começar grátis por 7 dias
            </Button>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-white/5 bg-black py-12 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row justify-between items-center gap-6 text-neutral-500 text-sm">
          <div className="flex items-center gap-2">
             <div className="h-6 w-6 rounded-md bg-white/10 flex items-center justify-center font-bold text-[10px] text-white">M</div>
             <span>© 2026 Markee Agendamentos. Todos os direitos reservados.</span>
          </div>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white transition-colors">Termos</a>
            <a href="#" className="hover:text-white transition-colors">Privacidade</a>
            <a href="#" className="hover:text-white transition-colors">Contato</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

