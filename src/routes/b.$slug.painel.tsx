import { createFileRoute } from "@tanstack/react-router";
import { PainelLayout } from "@/components/PainelLayout";

export const Route = createFileRoute("/b/$slug/painel")({
  component: TenantPainelRoute,
  head: () => ({ meta: [{ title: "Painel" }] }),
});

function TenantPainelRoute() {
  const { slug } = Route.useParams();
  return <PainelLayout slug={slug} />;
}
