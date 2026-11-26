// Mapa evento → efeito, sem dependência de servidor (usado no admin e no webhook).
export const EVENTO_PARA_STATUS_PUBLICO: Record<string, "ativa" | "atrasada" | "cancelada"> = {
  purchase_approved: "ativa",
  subscription_created: "ativa",
  subscription_renewed: "ativa",
  subscription_late_recovered: "ativa",
  subscription_resumed: "ativa",
  subscription_renewal_refused: "atrasada",
  subscription_late: "atrasada",
  subscription_paused: "cancelada",
  subscription_canceled: "cancelada",
  refund: "cancelada",
  chargeback: "cancelada",
};
