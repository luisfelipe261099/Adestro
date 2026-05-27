// Limites por plano SaaS. Documento §1 fala em "Trial / Starter / Pro / Business".
// Estes limites são checados nas APIs antes de criar recursos novos.

export type PlanName = "Trial" | "Starter" | "Pro" | "Business";

export const PLAN_LIMITS: Record<PlanName, {
  clients: number;
  dogsPerClient: number;
  monthlySessions: number;
  trainers: number; // multi-adestrador (módulo 10.2)
  storageMb: number;
  trialDays?: number;
}> = {
  Trial:    { clients: 3,   dogsPerClient: 2,  monthlySessions: 30,   trainers: 1, storageMb: 50,   trialDays: 14 },
  Starter:  { clients: 20,  dogsPerClient: 3,  monthlySessions: 80,   trainers: 1, storageMb: 500 },
  Pro:      { clients: 60,  dogsPerClient: 5,  monthlySessions: 300,  trainers: 3, storageMb: 2000 },
  Business: { clients: 99999, dogsPerClient: 99, monthlySessions: 99999, trainers: 99, storageMb: 10000 },
};

export function normalizePlan(plan?: string | null): PlanName {
  const value = (plan ?? "Trial").toLowerCase();
  if (value === "starter") return "Starter";
  if (value === "pro") return "Pro";
  if (value === "business" || value === "premium") return "Business";
  return "Trial";
}

export function getPlanLimits(plan?: string | null) {
  return PLAN_LIMITS[normalizePlan(plan)];
}

export type LimitCheckInput = {
  plan: string | null | undefined;
  resource: "client" | "session" | "trainer";
  currentCount: number;
  perClientCount?: number;
};

export type LimitCheckResult =
  | { ok: true }
  | { ok: false; reason: string; limit: number; current: number };

export function checkLimit(input: LimitCheckInput): LimitCheckResult {
  const limits = getPlanLimits(input.plan);
  const plan = normalizePlan(input.plan);

  if (input.resource === "client") {
    if (input.currentCount >= limits.clients) {
      return {
        ok: false,
        reason: `Plano ${plan} permite até ${limits.clients} clientes. Faça upgrade para adicionar mais.`,
        limit: limits.clients,
        current: input.currentCount,
      };
    }
    return { ok: true };
  }

  if (input.resource === "session") {
    if (input.currentCount >= limits.monthlySessions) {
      return {
        ok: false,
        reason: `Plano ${plan} permite até ${limits.monthlySessions} sessões/mês.`,
        limit: limits.monthlySessions,
        current: input.currentCount,
      };
    }
    return { ok: true };
  }

  if (input.resource === "trainer") {
    if (input.currentCount >= limits.trainers) {
      return {
        ok: false,
        reason: `Plano ${plan} permite até ${limits.trainers} adestrador(es) na conta.`,
        limit: limits.trainers,
        current: input.currentCount,
      };
    }
    return { ok: true };
  }

  return { ok: true };
}

export function getTrialDaysRemaining(trialEndsAt?: Date | null): number | null {
  if (!trialEndsAt) return null;
  const ms = trialEndsAt.getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
