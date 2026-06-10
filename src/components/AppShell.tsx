import heroBg from "@/assets/hero-bg.jpg";
import { ReactNode } from "react";
import { useTenantStatus } from "@/hooks/use-tenant-status";
import { TenantBlockedScreen } from "@/components/TenantBlockedScreen";
import { getCurrentTenantId } from "@/lib/tenant";

export function AppShell({
  children,
  allowBlockedAccess = false,
}: {
  children: ReactNode;
  /**
   * Quando true, NÃO renderiza o overlay de bloqueio mesmo se o tenant
   * estiver bloqueado. Usado na tela de Pagamentos do dono, para que ele
   * consiga regularizar a assinatura.
   */
  allowBlockedAccess?: boolean;
}) {
  // Guard global: se o tenant atual está bloqueado, ninguém usa a plataforma.
  // Cobre cliente final, dono e profissionais. /admin não usa AppShell.
  const tenantId = typeof window !== "undefined" ? getCurrentTenantId() : null;
  const { tenant, blocked } = useTenantStatus(tenantId);

  return (
    <>
      <div className="app-bg" style={{ backgroundImage: `url(${heroBg})` }} />
      <div className="app-overlay" />
      <div className="relative mx-auto flex min-h-screen w-full max-w-md md:max-w-3xl lg:max-w-5xl xl:max-w-6xl 2xl:max-w-7xl flex-col px-5 md:px-8 lg:px-10 pb-10 pt-6">
        {children}
      </div>
      {blocked && tenant && !allowBlockedAccess ? <TenantBlockedScreen tenant={tenant} /> : null}
    </>
  );
}
