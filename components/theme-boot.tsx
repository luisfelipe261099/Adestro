"use client";

import Script from "next/script";

// Boot script inline para evitar FOUC do dark mode.
// Lê localStorage e aplica `data-theme="dark"` no <html> antes do React hidratar.
export function ThemeBoot() {
  const code = `(()=>{try{var t=localStorage.getItem('adestro-theme');var s=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';var v=t||s;document.documentElement.setAttribute('data-theme',v);if(v==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`;
  return <Script id="theme-boot" strategy="beforeInteractive">{code}</Script>;
}
