import Image from "next/image";

// Logo oficial (criado no Canva, paleta nova). Duas peças em /public/brand:
// - nexus-logo.png   → símbolo + "NEXUS TIPS" (versão para fundo escuro)
// - nexus-symbol.png → só o símbolo (ícones, espaços pequenos)
// `size` é a altura de referência do símbolo, como na versão anterior do componente.
const LOGO_RATIO = 1200 / 358; // largura ÷ altura do nexus-logo.png
const SYMBOL_RATIO = 628 / 512; // largura ÷ altura do nexus-symbol.png

export function Logo({
  size = 28,
  withWordmark = true,
  className = "",
}: {
  size?: number;
  withWordmark?: boolean;
  className?: string;
}) {
  if (!withWordmark) {
    return (
      <Image
        src="/brand/nexus-symbol.png"
        alt="Nexus Tips"
        width={Math.round(size * SYMBOL_RATIO)}
        height={size}
        className={`flex-none ${className}`}
        priority
      />
    );
  }
  const h = Math.round(size * 1.3);
  return (
    <Image
      src="/brand/nexus-logo.png"
      alt="Nexus Tips"
      width={Math.round(h * LOGO_RATIO)}
      height={h}
      className={`flex-none ${className}`}
      priority
    />
  );
}
