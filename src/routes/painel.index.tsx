import { createFileRoute } from "@tanstack/react-router";
import { redirectToTenantPainel } from "./painel.$";

// Redireciona /painel exato para /b/<slug>/painel do usuário logado.
export const Route = createFileRoute("/painel/")({
  beforeLoad: async () => {
    await redirectToTenantPainel("");
  },
  component: () => null,
});
