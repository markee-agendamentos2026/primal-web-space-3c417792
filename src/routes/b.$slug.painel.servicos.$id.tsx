import { createFileRoute } from "@tanstack/react-router";
import ServiceForm from "@/components/ServiceForm";

export const Route = createFileRoute("/b/$slug/painel/servicos/$id")({
  component: () => {
    const { id } = Route.useParams();
    return <ServiceForm id={id} />;
  },
});
