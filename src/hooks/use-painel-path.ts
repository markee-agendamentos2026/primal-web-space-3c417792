import { useParams } from "@tanstack/react-router";
import { painelPath } from "@/lib/tenant-routes";
import { getCurrentTenantSlug } from "@/lib/tenant";

/** Links do painel sempre sob `/b/:slug/painel/...`. */
export function usePainelPath() {
  const params = useParams({ strict: false }) as { slug?: string };
  const slug = params.slug ?? getCurrentTenantSlug();
  return (subpath = "") => painelPath(subpath, slug);
}
