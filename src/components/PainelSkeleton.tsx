// Esqueleto exibido na hora em que a pessoa navega pro painel, enquanto o servidor busca
// os dados. Sem isso a tela parecia "travada" até a página nova chegar inteira.
export function PainelSkeleton() {
  const bloco = "rounded-2xl bg-white/[0.04] border border-white/[0.06] animate-pulse";
  return (
    <div className="flex flex-col gap-4 max-w-6xl">
      <div className={`${bloco} h-11`} />
      <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4">
        <div className={`${bloco} h-52 md:col-span-6 lg:col-span-5`} />
        <div className={`${bloco} h-52 md:col-span-6 lg:col-span-7`} />
        <div className={`${bloco} h-36 md:col-span-3 lg:col-span-4`} />
        <div className={`${bloco} h-36 md:col-span-3 lg:col-span-4`} />
        <div className={`${bloco} h-36 md:col-span-6 lg:col-span-4`} />
      </div>
    </div>
  );
}

export function TelaEntrando() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-5 bg-bg">
      <div className="relative w-16 h-16">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-info animate-spin" />
        <div className="absolute inset-4 rounded-full bg-primary/30 blur-md animate-pulse" />
      </div>
      <div className="text-sm text-text2">Abrindo seu painel…</div>
    </div>
  );
}
