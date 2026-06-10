// Helpers client-safe para a integração gratuita do WhatsApp (wa.me).

export type WaFreeVars = {
  cliente?: string | null;
  servico?: string | null;
  data?: string | null; // ISO yyyy-mm-dd
  hora?: string | null; // HH:mm
  profissional?: string | null;
  negocio?: string | null;
};

export function renderWaTemplate(tpl: string, vars: WaFreeVars): string {
  const fmtDate = (iso?: string | null) => {
    if (!iso) return "";
    try {
      const d = new Date(iso + "T12:00:00");
      return d.toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" });
    } catch { return iso ?? ""; }
  };
  const fmtTime = (t?: string | null) => (t ? t.slice(0, 5) : "");
  const map: Record<string, string> = {
    cliente: vars.cliente ?? "",
    servico: vars.servico ?? "",
    data: fmtDate(vars.data ?? null),
    hora: fmtTime(vars.hora ?? null),
    profissional: vars.profissional ?? "",
    negocio: vars.negocio ?? "",
  };
  return tpl.replace(/\{(\w+)\}/g, (_, k) => map[k] ?? "");
}

// Só dígitos. wa.me não aceita +.
export function waNumber(phone?: string | null): string {
  return (phone ?? "").replace(/\D/g, "");
}

export function waMeLink(phone: string | null | undefined, message: string): string {
  const n = waNumber(phone);
  const text = encodeURIComponent(message);
  return n ? `https://wa.me/${n}?text=${text}` : `https://wa.me/?text=${text}`;
}

export const WA_FREE_PLACEHOLDERS = ["{cliente}", "{servico}", "{data}", "{hora}", "{profissional}", "{negocio}"];
