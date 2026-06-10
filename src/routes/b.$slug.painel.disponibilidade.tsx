import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/b/$slug/painel/disponibilidade")({
  component: () => <Outlet />,
});
