import { z } from "zod";

// Schemas Zod compartilhados pelas rotas públicas e autenticadas.
// Uso: `const parsed = schema.safeParse(body)` antes de tocar no DB.

export const confirmPresenceSchema = z.object({
  eventId: z.string().min(1).max(64),
  confirmed: z.boolean(),
  reason: z.string().trim().max(280).optional(),
});

export const portalTaskUpdateSchema = z.object({
  taskId: z.string().min(1).max(64),
  completed: z.boolean(),
  evidenceUrl: z.string().max(5_000_000).nullable().optional(), // ~5 MB de base64
});

export const portalFeedbackSchema = z.object({
  message: z.string().trim().min(1).max(2000),
  author: z.enum(["Tutor", "Adestrador"]).optional(),
});

export const npsResponseSchema = z.object({
  sessionId: z.string().min(1).max(64),
  score: z.number().int().min(0).max(10),
  comment: z.string().trim().max(500).optional(),
});

export const trainerSettingsSchema = z.object({
  reminderHoursBefore: z.number().int().min(1).max(168).optional(),
  chargeReminderDaysBefore: z.number().int().min(0).max(30).optional(),
  morningBriefHour: z.number().int().min(0).max(23).optional(),
  defaultStreakTolerance: z.number().int().min(0).max(100).optional(),
  defaultActivities: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  defaultCommands: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  defaultTutorTasks: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(2000),
  keys: z.object({
    p256dh: z.string().min(1).max(500),
    auth: z.string().min(1).max(200),
  }),
});

export const csvImportRowSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z.string().trim().max(20).optional(),
  email: z.string().email().max(120).optional().or(z.literal("").transform(() => undefined)),
  dogName: z.string().trim().max(80).optional(),
  dogBreed: z.string().trim().max(80).optional(),
  notes: z.string().trim().max(500).optional(),
});

// Passo 1 do autocadastro por convite: só o essencial para o adestrador ter o
// contato. O resto o tutor preenche na ficha completa, logo em seguida.
export const clientInviteSchema = z.object({
  clientName: z.string().trim().min(1, "Informe seu nome").max(120),
  phone: z.string().trim().max(20).optional(),
  email: z.string().email("E-mail inválido").max(120).optional().or(z.literal("").transform(() => undefined)),
  dogName: z.string().trim().min(1, "Informe o nome do cão").max(80),
  breed: z.string().trim().max(80).optional(),
});

export type ConfirmPresenceInput = z.infer<typeof confirmPresenceSchema>;
export type PortalTaskUpdateInput = z.infer<typeof portalTaskUpdateSchema>;
export type PortalFeedbackInput = z.infer<typeof portalFeedbackSchema>;
export type NpsResponseInput = z.infer<typeof npsResponseSchema>;
export type TrainerSettingsInput = z.infer<typeof trainerSettingsSchema>;
export type PushSubscriptionInput = z.infer<typeof pushSubscriptionSchema>;
export type CsvImportRowInput = z.infer<typeof csvImportRowSchema>;
export type ClientInviteInput = z.infer<typeof clientInviteSchema>;

// Helper para retornar erro padronizado quando o schema falha.
export function badRequest(message: string, details?: unknown) {
  return new Response(
    JSON.stringify({ error: message, details: details ?? null }),
    { status: 400, headers: { "Content-Type": "application/json" } },
  );
}
