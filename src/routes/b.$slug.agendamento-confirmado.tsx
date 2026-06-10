import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ConfirmedPage } from "./agendamento-confirmado";
import { TenantSlugGate } from "@/components/TenantSlugGate";

export const Route = createFileRoute("/b/$slug/agendamento-confirmado")({
  validateSearch: z.object({ id: z.string().optional() }),
  component: SlugConfirmed,
  head: () => ({ meta: [{ title: "Agendamento confirmado" }] }),
});

function SlugConfirmed() {
  const { slug } = Route.useParams();
  return (
    <TenantSlugGate slug={slug}>
      <ConfirmedPage />
    </TenantSlugGate>
  );
}
