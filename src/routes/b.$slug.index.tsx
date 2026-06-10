import { createFileRoute } from "@tanstack/react-router";
import { Index } from "./index";
import { TenantSlugGate } from "@/components/TenantSlugGate";

export const Route = createFileRoute("/b/$slug/")({
  component: SlugIndex,
  head: () => ({ meta: [{ title: "Agendamento" }] }),
});

function SlugIndex() {
  const { slug } = Route.useParams();
  return (
    <TenantSlugGate slug={slug}>
      <Index />
    </TenantSlugGate>
  );
}
