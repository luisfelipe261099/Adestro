"use client";

import { useEffect, useState } from "react";

/**
 * Relógio para os painéis que dependem de "agora" (aula em andamento, aula
 * atrasada, cobrança vencida).
 *
 * Existe por dois motivos:
 *  - `Date.now()` chamado direto dentro de `useMemo` é impuro: o valor congela
 *    no primeiro render e o quadro só atualiza se algo mais mudar. Uma aula
 *    ficaria como "Agendada" muito depois de ter começado.
 *  - o tick faz a home andar sozinha ao longo do dia, sem F5.
 *
 * O valor inicial vem de um inicializador preguiçoso do useState — não de uma
 * chamada durante o render. Não há risco de divergência na hidratação porque o
 * store começa vazio no servidor: todos estes painéis renderizam o estado
 * "sem dados" no HTML inicial.
 */
export function useNow(intervalMs = 60_000): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);

  return now;
}
