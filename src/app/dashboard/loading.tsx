import { TelaEntrando } from "@/components/PainelSkeleton";

// Aparece instantaneamente ao entrar no painel (login/cadastro), antes do layout carregar.
export default function Loading() {
  return <TelaEntrando />;
}
