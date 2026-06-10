import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// Catch-all legado para /painel/* — redireciona para /b/<slug>/painel/<rest>
// onde <slug> é resolvido a partir do user_roles do usuário logado (sem
// confiar em localStorage para identificar o tenant).
export const Route = createFileRoute("/painel/$")({
  beforeLoad: async ({ params }) => {
    await redirectToTenantPainel((params as any)._splat || "");
  },
  component: () => null,
});

export async function redirectToTenantPainel(rest: string): Promise<never> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw redirect({ to: "/" });
  const { data } = await supabase
    .from("user_roles")
    .select("tenants!user_roles_tenant_id_fkey(slug)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  const slug = (data?.tenants as any)?.slug as string | undefined;
  if (!slug) throw redirect({ to: "/" });
  const target = `/b/${slug}/painel${rest ? `/${rest}` : ""}`;
  throw redirect({ to: target as any });
}
