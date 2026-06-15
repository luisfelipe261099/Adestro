"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useAppStore } from "@/lib/app-store";

/**
 * Carrega dados do banco (clientes, sessões, agenda, pagamentos)
 * para o Zustand store após login.
 * Também seta trainerName/Email no store usando a sessão NextAuth.
 */
export function DataLoader() {
  const { data: session, status } = useSession();
  const loadFromDB       = useAppStore((state) => state.loadFromDB);
  const login            = useAppStore((state) => state.login);
  const setDataLoadError = useAppStore((state) => state.setDataLoadError);
  const loaded           = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user) return;
    if (loaded.current) return;
    loaded.current = true;

    // Atualiza nome/email no store via login
    const email = session.user.email ?? "";
    const role  = ((session.user as { role?: string }).role ?? "trainer").toLowerCase() as "trainer" | "admin" | "client";
    login(email, role);

    // Apenas adestradores possuem dados no store principal (clientes, sessões,
    // agenda, pagamentos). Admin e cliente não usam essas APIs — para eles, o
    // /api/clients, /api/sessions etc. retornam 403 e disparariam o banner de
    // "não foi possível sincronizar" sem motivo. Por isso só sincronizamos para trainer.
    if (role === "trainer") {
      loadFromDB();
    } else {
      // Garante que nenhum erro de sincronização antigo continue visível.
      setDataLoadError(null);
    }
  }, [status, session, loadFromDB, login, setDataLoadError]);

  return null;
}
