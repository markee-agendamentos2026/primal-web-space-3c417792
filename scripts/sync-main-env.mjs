/**
 * Sincroniza .env → .env.development.local + .dev.vars (Supabase MAIN / Lovable cloud).
 * Uso: node scripts/sync-main-env.mjs
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const envPath = resolve(root, ".env");
if (!existsSync(envPath)) {
  console.error("Arquivo .env não encontrado na raiz do projeto.");
  process.exit(1);
}

const raw = readFileSync(envPath, "utf8");
const vars = {};
for (const line of raw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  vars[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const url = vars.VITE_SUPABASE_URL || vars.SUPABASE_URL;
const anon = vars.VITE_SUPABASE_PUBLISHABLE_KEY || vars.SUPABASE_PUBLISHABLE_KEY;
const projectId = vars.VITE_SUPABASE_PROJECT_ID || "oaygouigevynbsexxdzw";
let serviceRole = vars.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !anon) {
  console.error(".env precisa de VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

function jwtRef(key) {
  try {
    const payload = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString("utf8"));
    return payload.ref ?? null;
  } catch {
    return null;
  }
}

function urlRef(u) {
  const m = u.match(/https?:\/\/([^.]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

async function validateServiceRole(key) {
  if (!key || key.includes("COLE_")) return false;
  const expected = urlRef(url);
  const got = jwtRef(key);
  if (expected && got && expected !== got) {
    console.warn(
      `\n⚠️  service_role é do projeto "${got}" mas a URL é "${expected}".\n` +
        `   Dashboard correto: https://supabase.com/dashboard/project/${expected}/settings/api\n`,
    );
    return false;
  }
  try {
    const res = await fetch(`${url}/rest/v1/tenants?select=id&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) return false;
    return true;
  } catch {
    return false;
  }
}

const ok = serviceRole ? await validateServiceRole(serviceRole) : false;
if (serviceRole && !ok) {
  console.warn("⚠️  SUPABASE_SERVICE_ROLE_KEY do .env NÃO funciona com", url);
  serviceRole = "";
}

const placeholder = "COLE_SERVICE_ROLE_DO_PROJETO_oaygouigevynbsexxdzw";

const block = `# Supabase MAIN (Lovable) — projeto ${projectId}
# service_role: https://supabase.com/dashboard/project/${projectId}/settings/api

VITE_APP_ENV=main-local
VITE_SUPABASE_URL=${url}
VITE_SUPABASE_PUBLISHABLE_KEY=${anon}
VITE_SUPABASE_PROJECT_ID=${projectId}

SUPABASE_URL=${url}
SUPABASE_PUBLISHABLE_KEY=${anon}
SUPABASE_SERVICE_ROLE_KEY=${serviceRole || placeholder}
`;

const devLocal = resolve(root, ".env.development.local");
const devVars = resolve(root, ".dev.vars");

writeFileSync(devLocal, block, "utf8");
writeFileSync(
  devVars,
  `SUPABASE_URL=${url}
SUPABASE_PUBLISHABLE_KEY=${anon}
SUPABASE_SERVICE_ROLE_KEY=${serviceRole || placeholder}
`,
  "utf8",
);

console.log("OK:", devLocal);
console.log("OK:", devVars);
if (!serviceRole) {
  console.log("\n→ Cole a service_role correta nos dois arquivos e reinicie: npm run dev\n");
} else {
  console.log("\n✓ Service role válida para o MAIN. Reinicie: npm run dev\n");
}
