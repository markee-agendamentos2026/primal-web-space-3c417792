import { createFileRoute } from "@tanstack/react-router";
import { AgendarPage } from "./agendar";
import { TenantSlugGate } from "@/components/TenantSlugGate";

export const Route = createFileRoute("/b/$slug/agendar")({
  component: SlugAgendar,
  head: () => ({ meta: [{ title: "Agendar" }] }),
});

function SlugAgendar() {
  const { slug } = Route.useParams();
  return (
    <TenantSlugGate slug={slug}>
      <AgendarPage />
    </TenantSlugGate>
  );
}
