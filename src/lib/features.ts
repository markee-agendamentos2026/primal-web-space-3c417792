// Catálogo de features de fluxo. Centralizado para BackOffice e Painel.
export type FeatureKey = "flow.client_location" | "flow.wa_free";

export type FeatureDef = {
  key: FeatureKey;
  label: string;
  description: string;
  category: "Fluxo de agendamento" | "Comunicação";
};

export const FEATURES: FeatureDef[] = [
  {
    key: "flow.client_location",
    label: "Coleta de endereço do cliente",
    description:
      "Para empresas que vão até o cliente (lava rápido, barbeiro/manicure em domicílio, etc). Adiciona uma etapa de CEP + endereço no fluxo de agendamento.",
    category: "Fluxo de agendamento",
  },
  {
    key: "flow.wa_free",
    label: "WhatsApp Gratuito (confirmação + lembrete)",
    description:
      "Libera no painel do dono a opção de gerar mensagens prontas no WhatsApp (link wa.me) para confirmação do cliente no ato do agendamento e lembrete X minutos antes. Não usa a API paga — o envio é por clique.",
    category: "Comunicação",
  },
];

export const FEATURE_KEYS = FEATURES.map((f) => f.key) as FeatureKey[];
