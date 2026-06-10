/** Extrai o project ref da URL Supabase (ex.: https://xxx.supabase.co → xxx). */
export function projectRefFromSupabaseUrl(url: string): string | null {
  const m = url.match(/https?:\/\/([^.]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

/** Lê `ref` do payload JWT (anon ou service_role). */
export function jwtProjectRef(key: string): string | null {
  try {
    const parts = key.split(".");
    if (parts.length < 2) return null;
    const b64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const json =
      typeof Buffer !== "undefined"
        ? Buffer.from(b64, "base64").toString("utf8")
        : atob(b64);
    const payload = JSON.parse(json);
    return typeof payload.ref === "string" ? payload.ref : null;
  } catch {
    return null;
  }
}

export function isPlaceholderServiceRole(key: string): boolean {
  return !key || key.includes("COLE_") || key.length < 20;
}

/** Garante que service_role pertence ao mesmo projeto da URL — evita "Invalid API key". */
export function assertServiceRoleMatchesUrl(url: string, serviceRoleKey: string): void {
  if (isPlaceholderServiceRole(serviceRoleKey)) {
    const ref = projectRefFromSupabaseUrl(url) ?? "SEU-PROJECT";
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY ausente ou placeholder. Cole a service_role do projeto ${ref} em .dev.vars — https://supabase.com/dashboard/project/${ref}/settings/api`,
    );
  }
  const urlRef = projectRefFromSupabaseUrl(url);
  const keyRef = jwtProjectRef(serviceRoleKey);
  // Chaves novas sb_secret_* não são JWT — validação só por fetch / URL
  if (urlRef && keyRef && urlRef !== keyRef) {
    throw new Error(
      `SUPABASE_SERVICE_ROLE_KEY é do projeto "${keyRef}" mas SUPABASE_URL aponta para "${urlRef}". ` +
        `Alinhe URL e chaves (npm run env:self para gpirjdeebpnakndlogpr ou npm run env:main para MAIN).`,
    );
  }
}

export function formatInvalidApiKeyHint(url: string): string {
  const ref = projectRefFromSupabaseUrl(url) ?? "SEU-PROJECT";
  return `Chave inválida para este Supabase. Atualize SUPABASE_SERVICE_ROLE_KEY em .dev.vars com a service_role de https://supabase.com/dashboard/project/${ref}/settings/api e reinicie npm run dev.`;
}
