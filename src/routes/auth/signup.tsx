import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/signup")({
  component: SignupPage,
});

function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. Criar usuário no Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            business_name: businessName,
          }
        }
      });

      if (authError) throw authError;

      toast.success("Conta criada! Verifique seu e-mail para confirmar.");
      navigate({ to: "/auth/login" });
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12">
      <div className="absolute inset-0 bg-primary/5 blur-[120px] -z-10" />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg space-y-8"
      >
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary mb-6 shadow-[0_0_30px_rgba(212,166,74,0.3)]">
            <Sparkles className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-4xl font-display font-black tracking-tight">Comece sua jornada</h1>
          <p className="text-zinc-500 mt-2 max-w-sm">Junte-se a centenas de empresas que escolheram a sofisticação da Markee.</p>
        </div>

        <div className="grid md:grid-cols-1 gap-8">
          <form onSubmit={handleSignup} className="space-y-5 bg-zinc-900/50 p-8 rounded-[32px] border border-white/5 backdrop-blur-xl">
            <div className="space-y-2">
              <Label htmlFor="business">Nome do seu Negócio</Label>
              <Input
                id="business"
                placeholder="Ex: Barbearia Premium"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="bg-black border-white/10 h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail Profissional</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-black border-white/10 h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-black border-white/10 h-12 rounded-xl"
              />
            </div>

            <Button 
              disabled={loading}
              className="w-full h-14 bg-primary text-black hover:bg-primary/90 font-bold text-lg rounded-xl mt-4"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Criar Minha Conta Grátis"}
            </Button>

            <p className="text-center text-sm text-zinc-500">
              Já tem uma conta?{" "}
              <button 
                type="button"
                onClick={() => navigate({ to: "/auth/login" })}
                className="text-primary font-bold hover:underline"
              >
                Faça login
              </button>
            </p>
          </form>

          <div className="hidden md:flex flex-col justify-center space-y-6 px-4">
             {[
               "Acesso total por 14 dias",
               "Sem necessidade de cartão",
               "Suporte premium incluído",
               "Configuração em 5 minutos"
             ].map((text, i) => (
               <div key={i} className="flex items-center gap-3 text-zinc-400">
                 <CheckCircle2 className="h-5 w-5 text-primary" />
                 <span className="text-sm font-medium">{text}</span>
               </div>
             ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
