"use client";

import { useState } from "react";

import { addCustomOption, mergeOptions, OTHER_OPTION } from "@/lib/dog-options";

// Lista de opções com "Outros" que alimenta a lista do próprio adestrador.
//
// O que ele digita no "Outros" não fica só naquele cadastro: sobe para as
// opções dele e aparece nos próximos cães. Também dá para remover o que ele
// mesmo criou — o cliente lembrou do caso de digitar o nome errado e ficar
// preso com ele na lista.

type Props = {
  label: string;
  /** Opções fixas do sistema. */
  padrao: readonly string[];
  /** Opções que o adestrador criou. */
  doAdestrador: string[];
  /** Itens marcados. */
  selecionados: string[];
  onChange: (selecionados: string[]) => void;
  onAddOption: (novaLista: string[]) => void;
  /** Marcar mais de um? Comportamento é único; foco é múltiplo. */
  multiplo?: boolean;
};

export function OptionPicker({
  label,
  padrao,
  doAdestrador,
  selecionados,
  onChange,
  onAddOption,
  multiplo = true,
}: Props) {
  const [digitando, setDigitando] = useState(false);
  const [novo, setNovo] = useState("");
  const opcoes = mergeOptions(padrao, doAdestrador);

  function alternar(opcao: string) {
    if (!multiplo) {
      onChange(selecionados[0] === opcao ? [] : [opcao]);
      return;
    }
    onChange(
      selecionados.includes(opcao)
        ? selecionados.filter((item) => item !== opcao)
        : [...selecionados, opcao],
    );
  }

  function confirmarNovo() {
    const lista = addCustomOption(padrao, doAdestrador, novo);
    const limpo = novo.trim();
    if (lista) onAddOption(lista);
    if (limpo) alternar(limpo);
    setNovo("");
    setDigitando(false);
  }

  function removerCustom(opcao: string) {
    onAddOption(doAdestrador.filter((item) => item !== opcao));
    onChange(selecionados.filter((item) => item !== opcao));
  }

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface-2)]/40 p-3">
      <span className="text-[12px] font-bold uppercase tracking-wider text-[var(--muted)]">{label}</span>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {opcoes.map((opcao) => {
          const marcado = selecionados.includes(opcao);
          const criadoPorEle = doAdestrador.includes(opcao);
          return (
            <span key={opcao} className="inline-flex items-center">
              <button
                type="button"
                onClick={() => alternar(opcao)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                  marcado
                    ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-white"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--border-strong)]"
                }`}
              >
                {opcao}
              </button>
              {criadoPorEle ? (
                <button
                  type="button"
                  onClick={() => removerCustom(opcao)}
                  title={`Remover "${opcao}" da sua lista`}
                  className="-ml-1 rounded-full px-1.5 text-[13px] text-[var(--muted)] hover:text-rose-600"
                >
                  ×
                </button>
              ) : null}
            </span>
          );
        })}

        {digitando ? (
          <span className="inline-flex items-center gap-1">
            <input
              autoFocus
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmarNovo();
                }
                if (e.key === "Escape") {
                  setNovo("");
                  setDigitando(false);
                }
              }}
              placeholder="Escreva e tecle Enter"
              className="w-48 rounded-full border border-[var(--accent)] bg-[var(--surface)] px-3 py-1.5 text-xs outline-none"
            />
            <button
              type="button"
              onClick={confirmarNovo}
              className="rounded-full bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white"
            >
              Adicionar
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setDigitando(true)}
            className="rounded-full border border-dashed border-[var(--border-strong)] px-3 py-1.5 text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            + {OTHER_OPTION}
          </button>
        )}
      </div>
    </div>
  );
}
