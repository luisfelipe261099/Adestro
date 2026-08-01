// Regras compartilhadas das tarefas recorrentes do portal.
//
// O banco guarda um flag `completed` (do último toggle) e o histórico
// `completions` (["YYYY-MM-DD", ...]). Para tarefa recorrente, "concluída"
// precisa ser derivada POR DIA a partir de `completions` — senão a tarefa
// diária concluída ontem aparece marcada para sempre.
//
// Fuso: usa a hora local do processo que chama (mesmo critério do PATCH que
// grava a conclusão), para o dia "virar" de forma consistente.

export type RecurringTaskShape = {
  completed: boolean;
  recurrence?: string | null; // "once" | "daily" | "weekly"
  weekdays?: string | null; // JSON [0..6] (0 = domingo) quando weekly
  completions?: string | null; // JSON ["YYYY-MM-DD", ...]
};

export function localDateKey(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseCompletions(raw?: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

export function parseWeekdays(raw?: string | null): number[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(Number).filter((n) => n >= 0 && n <= 6) : [];
  } catch {
    return [];
  }
}

/** A tarefa vale para hoje? (once/daily sempre; weekly só nos dias marcados) */
export function isTaskDueToday(task: Pick<RecurringTaskShape, "recurrence" | "weekdays">, date = new Date()): boolean {
  if (task.recurrence === "weekly") {
    const days = parseWeekdays(task.weekdays);
    return days.length === 0 || days.includes(date.getDay());
  }
  return true;
}

/** Concluída HOJE: once usa o flag; recorrente exige a data de hoje no histórico. */
export function isTaskCompletedToday(task: RecurringTaskShape, date = new Date()): boolean {
  if (!task.recurrence || task.recurrence === "once") return task.completed;
  return parseCompletions(task.completions).includes(localDateKey(date));
}

/**
 * Aplica um toggle de conclusão em uma tarefa recorrente: adiciona/remove a
 * data de hoje no histórico e devolve o novo par {completed, completions}
 * prontos para gravar. Para "once", só espelha o flag.
 */
export function applyTaskToggle(
  task: RecurringTaskShape,
  completed: boolean,
  date = new Date(),
): { completed: boolean; completions: string | null } {
  if (!task.recurrence || task.recurrence === "once") {
    return { completed, completions: task.completions ?? null };
  }
  const todayStr = localDateKey(date);
  let completions = parseCompletions(task.completions);
  if (completed) {
    if (!completions.includes(todayStr)) completions = [...completions, todayStr];
  } else {
    completions = completions.filter((d) => d !== todayStr);
  }
  return {
    completed: completions.includes(todayStr),
    completions: JSON.stringify(completions.slice(-180)),
  };
}

/** Serializa a tarefa para a API: `completed` vira "concluída hoje" + flag isDueToday. */
export function serializeTaskForToday<T extends RecurringTaskShape>(
  task: T,
  date = new Date(),
): T & { completed: boolean; isDueToday: boolean } {
  return {
    ...task,
    completed: isTaskCompletedToday(task, date),
    isDueToday: isTaskDueToday(task, date),
  };
}
