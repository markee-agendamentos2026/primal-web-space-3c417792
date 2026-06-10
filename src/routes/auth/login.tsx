import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast.success("Bem-vindo de volta!");
      navigate({ to: "/admin" }); // Redireciona para o painel
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary mb-6 shadow-[0_0_30px_rgba(212,166,74,0.3)]">
            <Sparkles className="h-7 w-7 text-black" />
          </div>
          <h1 className="text-3xl font-display font-black tracking-tight">Acesse sua conta</h1>
          <p className="text-zinc-500 mt-2">Bem-vindo à nova era da gestão.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6 bg-zinc-900/50 p-8 rounded-[32px] border border-white/5 backdrop-blur-xl">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black border-white/10 h-12 focus:border-primary transition-all rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label htmlFor="password">Senha</Label>
              <button type="button" className="text-xs text-primary hover:underline">Esqueceu a senha?</button>
            </div>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black border-white/10 h-12 focus:border-primary transition-all rounded-xl"
            />
          </div>

          <Button 
            disabled={loading}
            className="w-full h-12 bg-white text-black hover:bg-zinc-200 font-bold text-lg rounded-xl transition-all"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Entrar na Markee"}
          </Button>

          <p className="text-center text-sm text-zinc-500">
            Não tem uma conta?{" "}
            <button 
              type="button"
              onClick={() => navigate({ to: "/auth/signup" })}
              className="text-primary font-bold hover:underline"
            >
              Crie agora
            </button>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
