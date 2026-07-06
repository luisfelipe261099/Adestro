// Marca do Adestro: o brasão (cão + triângulo metálico). Fonte única do logo —
// reutilize no header, landing, login etc. para manter a identidade consistente.
// A imagem é o mesmo brasão do favicon/PWA (/public/logo-mark.png, sem fundo).
import Image from "next/image";

export function BrandMark({ className = "h-7 w-7" }: { className?: string }) {
  return (
    <Image
      src="/logo-mark.png"
      alt="Adestro"
      width={40}
      height={40}
      priority
      className={`shrink-0 object-contain ${className}`}
    />
  );
}
