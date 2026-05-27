"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

import { setCustomWaTemplates } from "@/lib/whatsapp";

// Carrega templates customizáveis de WhatsApp uma vez por sessão e injeta
// no módulo whatsapp.ts. Sem visual.
export function WhatsAppTemplatesLoader() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/trainer/whatsapp-templates", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data || typeof data !== "object") return;
        setCustomWaTemplates(data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [status]);

  return null;
}
