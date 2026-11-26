// Checkout da Cakto (plano único). O link pode ser trocado pela variável
// NEXT_PUBLIC_CAKTO_CHECKOUT_URL sem mexer no código.
export const CHECKOUT_URL =
  process.env.NEXT_PUBLIC_CAKTO_CHECKOUT_URL || "https://pay.cakto.com.br/3cwwbz6_1376495";

// O parâmetro `callback` volta pra gente dentro de cada aviso (webhook) da Cakto. Mandamos
// o id da conta Nexus nele: assim a compra é ligada à conta certa mesmo que a pessoa use
// outro e-mail no checkout. A Cakto aceita letras, números e . _ ~ - (um UUID cabe).
export function urlDoCheckout(userId?: string | null) {
  if (!userId) return CHECKOUT_URL;
  const u = new URL(CHECKOUT_URL);
  u.searchParams.set("callback", userId);
  return u.toString();
}
