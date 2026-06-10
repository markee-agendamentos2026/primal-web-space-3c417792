import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legado: /b/:slug/painel/disponibilidade/mais-ajustes → /b/:slug/painel/mais-ajustes */
export const Route = createFileRoute("/b/$slug/painel/disponibilidade/mais-ajustes")({
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/b/$slug/painel/mais-ajustes",
      params: { slug: params.slug },
      replace: true,
    });
  },
  component: () => null,
});
