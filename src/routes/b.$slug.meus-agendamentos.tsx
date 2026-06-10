import { createFileRoute } from "@tanstack/react-router";
import { MyBookings } from "./meus-agendamentos";
import { TenantSlugGate } from "@/components/TenantSlugGate";

export const Route = createFileRoute("/b/$slug/meus-agendamentos")({
  component: SlugMyBookings,
  head: () => ({ meta: [{ title: "Meus agendamentos" }] }),
});

function SlugMyBookings() {
  const { slug } = Route.useParams();
  return (
    <TenantSlugGate slug={slug}>
      <MyBookings />
    </TenantSlugGate>
  );
}
