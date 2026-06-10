import { createFileRoute } from "@tanstack/react-router";
import ServiceForm from "@/components/ServiceForm";

export const Route = createFileRoute("/b/$slug/painel/servicos/novo")({ component: () => <ServiceForm /> });
