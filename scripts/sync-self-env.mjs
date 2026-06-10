/**
 * Sincroniza .env.self → .env.development.local + .dev.vars (projeto gpirjdeebpnakndlogpr).
 * Uso: npm run env:self
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const selfPath = resolve(root, ".env.self");
if (!existsSync(selfPath)) {
  console.error("Arquivo .env.self não encontrado. Copie de .env.example ou crie com as chaves do seu projeto.");
  process.exit(1);
}

const raw = readFileSync(selfPath, "utf8");
const vars = {};
for (const line of raw.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i === -1) continue;
  vars[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const url = vars.VITE_SUPABASE_URL_SELF || vars.SUPABASE_URL_SELF;
const anon = vars.VITE_SUPABASE_ANON_KEY_SELF || vars.VITE_SUPABASE_PUBLISHABLE_KEY_SELF;
const projectId = vars.VITE_SUPABASE_PROJECT_ID_SELF || "gpirjdeebpnakndlogpr";
let serviceRole =
  vars.SUPABASE_SERVICE_ROLE_KEY_SELF ||
  vars.SUPABASE_SERVICE_ROLE_KEY ||
  "";

if (!url || !anon) {
  console.error(".env.self precisa de VITE_SUPABASE_URL_SELF e VITE_SUPABASE_ANON_KEY_SELF");
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
  if (expected && got && expected !== got) return false;
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

const ok = serviceRole ? await validateServiceRole(serviceRole) : false;
if (serviceRole && !ok && serviceRole.startsWith("sb_secret_")) {
  console.warn("⚠️  sb_secret_* não validou via REST (normal em alguns ambientes). Confira no dashboard se a chave está ativa.");
}

const block = `# Supabase SELF — projeto ${projectId}
# Dashboard: https://supabase.com/dashboard/project/${projectId}/settings/api
# Rode migrations: supabase link --project-ref ${projectId} && supabase db push

VITE_APP_ENV=self-local
VITE_SUPABASE_URL=${url}
VITE_SUPABASE_PUBLISHABLE_KEY=${anon}
VITE_SUPABASE_PROJECT_ID=${projectId}

SUPABASE_URL=${url}
SUPABASE_PUBLISHABLE_KEY=${anon}
SUPABASE_SERVICE_ROLE_KEY=${serviceRole || "COLE_SERVICE_ROLE_DO_PROJETO_" + projectId}
`;

const devLocal = resolve(root, ".env.development.local");
const devVars = resolve(root, ".dev.vars");

writeFileSync(devLocal, block, "utf8");
writeFileSync(
  devVars,
  `SUPABASE_URL=${url}
SUPABASE_PUBLISHABLE_KEY=${anon}
SUPABASE_SERVICE_ROLE_KEY=${serviceRole || "COLE_SERVICE_ROLE_DO_PROJETO_" + projectId}
`,
  "utf8",
);

console.log("OK:", devLocal);
console.log("OK:", devVars);
console.log(`\n→ Projeto: ${projectId}`);
if (!serviceRole) {
  console.log("→ Cole SUPABASE_SERVICE_ROLE_KEY_SELF no .env.self e rode npm run env:self de novo\n");
} else {
  console.log("→ Reinicie: npm run dev\n");
}
