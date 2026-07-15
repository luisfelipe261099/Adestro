"use client";

import Script from "next/script";

// Boot script inline para evitar FOUC do dark mode.
// Lê localStorage e aplica `data-theme` no <html> antes do React hidratar.
// PADRÃO = ESCURO: quem preferir o claro troca no botão ☀️ (a escolha fica salva).
export function ThemeBoot() {
  const code = `(()=>{try{var t=localStorage.getItem('adestro-theme');var v=(t==='light'||t==='dark')?t:'dark';document.documentElement.setAttribute('data-theme',v);if(v==='dark')document.documentElement.classList.add('dark');}catch(e){document.documentElement.setAttribute('data-theme','dark');}})();`;
  return <Script id="theme-boot" strategy="beforeInteractive">{code}</Script>;
}
