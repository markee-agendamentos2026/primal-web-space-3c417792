import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft, Check, Loader2 } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Step = "personal" | "business" | "branding" | "summary" | "status";

export function OnboardingFlow() {
  const [step, setStep] = useState<Step>("personal");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    businessName: "",
    segment: "",
    primaryColor: "#ffffff",
    secondaryColor: "#000000",
  });

  const nextStep = (next: Step) => setStep(next);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("onboarding_requests").insert([
        {
          full_name: formData.name,
          email: formData.email,
          phone: formData.phone,
          business_name: formData.businessName,
          segment: formData.segment,
          metadata: {
            primaryColor: formData.primaryColor,
            secondaryColor: formData.secondaryColor,
          },
        },
      ]);

      if (error) throw error;

      setStep("status");
    } catch (error: any) {
      toast({
        title: "Erro ao salvar cadastro",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="mx-auto max-w-xl px-6 py-20">
      <div className="mb-12 flex justify-between">
        {(["personal", "business", "branding", "summary"] as Step[]).map((s, idx) => (
          <div key={s} className="flex flex-col items-center gap-2">
            <div 
              className={`h-2 w-12 rounded-full transition-all duration-500 ${
                idx <= ["personal", "business", "branding", "summary"].indexOf(step) 
                  ? "bg-white" 
                  : "bg-white/10"
              }`} 
            />
          </div>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {step === "personal" && (
          <motion.div
            key="personal"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Dados Pessoais</h2>
              <p className="text-neutral-400">Conte-nos quem você é para começarmos sua jornada.</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <Input 
                  id="name" 
                  placeholder="Seu nome" 
                  className="bg-white/5 border-white/10 h-12 focus:border-white/20 transition-all"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  className="bg-white/5 border-white/10 h-12"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                />
              </div>
            </div>
            <Button 
              className="w-full h-12 bg-white text-black hover:bg-neutral-200 rounded-full font-semibold"
              onClick={() => nextStep("business")}
            >
              Continuar <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </motion.div>
        )}

        {step === "business" && (
          <motion.div
            key="business"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Sobre seu Negócio</h2>
              <p className="text-neutral-400">Como é a sua empresa?</p>
            </div>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Nome da Empresa</Label>
                <Input 
                  id="businessName" 
                  placeholder="Nome da sua marca" 
                  className="bg-white/5 border-white/10 h-12"
                  value={formData.businessName}
                  onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="segment">Segmento</Label>
                <Input 
                  id="segment" 
                  placeholder="Ex: Estética, Consultoria, etc" 
                  className="bg-white/5 border-white/10 h-12"
                  value={formData.segment}
                  onChange={(e) => setFormData({...formData, segment: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="h-12 w-12 rounded-full border-white/10" onClick={() => nextStep("personal")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button className="flex-1 h-12 bg-white text-black hover:bg-neutral-200 rounded-full font-semibold" onClick={() => nextStep("branding")}>
                Continuar
              </Button>
            </div>
          </motion.div>
        )}

        {step === "branding" && (
          <motion.div
            key="branding"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Identidade Visual</h2>
              <p className="text-neutral-400">Escolha as cores primárias do seu sistema.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center cursor-pointer hover:border-white/20 transition-all">
                <div className="mx-auto h-12 w-12 rounded-full bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]" />
                <span className="text-sm font-medium">Ocean Blue</span>
              </div>
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center cursor-pointer hover:border-white/20 transition-all">
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]" />
                <span className="text-sm font-medium">Forest Green</span>
              </div>
              <div className="space-y-4 rounded-2xl border border-white/20 bg-white/10 p-6 text-center cursor-pointer">
                <div className="mx-auto h-12 w-12 rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.2)]" />
                <span className="text-sm font-medium">Minimal White</span>
              </div>
              <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 text-center cursor-pointer hover:border-white/20 transition-all">
                <div className="mx-auto h-12 w-12 rounded-full bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.3)]" />
                <span className="text-sm font-medium">Royal Purple</span>
              </div>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" className="h-12 w-12 rounded-full border-white/10" onClick={() => nextStep("business")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button className="flex-1 h-12 bg-white text-black hover:bg-neutral-200 rounded-full font-semibold" onClick={() => nextStep("summary")}>
                Continuar
              </Button>
            </div>
          </motion.div>
        )}

        {step === "summary" && (
          <motion.div
            key="summary"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Confirmação</h2>
              <p className="text-neutral-400">Revise seus dados antes de finalizar.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-8 space-y-6">
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-neutral-400">Empresa</span>
                <span className="font-semibold">{formData.businessName || "Sua Empresa"}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-white/5">
                <span className="text-neutral-400">Responsável</span>
                <span className="font-semibold">{formData.name || "Seu Nome"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-neutral-400">Visual</span>
                <div className="flex items-center gap-2">
                   <div className="h-4 w-4 rounded-full bg-white" />
                   <span className="font-semibold">Minimalist</span>
                </div>
              </div>
            </div>
            <Button className="w-full h-14 bg-white text-black hover:bg-neutral-200 rounded-full font-bold text-lg" onClick={() => nextStep("status")}>
              Finalizar Cadastro
            </Button>
          </motion.div>
        )}

        {step === "status" && (
          <motion.div
            key="status"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 text-center"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white text-black">
              <Check className="h-10 w-10" />
            </div>
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight">Cadastro Concluído</h2>
              <p className="text-neutral-400 max-w-sm mx-auto">Seu ambiente multi-tenant está sendo preparado. Você receberá um email em instantes.</p>
            </div>
            <div className="p-8 rounded-2xl border border-white/10 bg-white/5 flex flex-col items-center gap-4">
               <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-medium">Provisionando banco de dados...</span>
               </div>
               <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }} 
                    animate={{ width: "65%" }} 
                    transition={{ duration: 2 }}
                    className="h-full bg-white" 
                  />
               </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-full border-white/10"
              onClick={() => navigate({ to: "/b/markee" })}
            >
              Voltar para Home
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
