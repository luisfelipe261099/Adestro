// Campo de data unificado do app — um único "selecionador de datas" com o visual
// do design system (borda, foco com anel de --accent e ícone de calendário
// consistente). Encapsula <input type="date"> para que toda entrada de data tenha
// a mesma aparência. Width fica por conta de quem usa (ex.: className="w-full" em
// formulários; sem width em filtros inline tipo "início até fim").
import type { ComponentPropsWithoutRef } from "react";

type DateFieldProps = Omit<ComponentPropsWithoutRef<"input">, "type">;

export function DateField({ className = "", ...props }: DateFieldProps) {
  return <input type="date" className={`date-field ${className}`.trim()} {...props} />;
}
