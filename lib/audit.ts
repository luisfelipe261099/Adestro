import { prisma } from "@/lib/prisma";

// Audit log — registra ações importantes para multi-adestrador (módulo 10.2).
// Use sempre que houver criação/edição/remoção de recurso "shared".

export type AuditAction =
  | "client.created"
  | "client.updated"
  | "client.deleted"
  | "dog.created"
  | "dog.updated"
  | "session.created"
  | "session.updated"
  | "session.deleted"
  | "contract.created"
  | "invoice.paid"
  | "plan.changed"
  | "settings.updated"
  | "template.updated"
  | "portal-link.created"
  | "portal-link.revoked"
  | "invite.created"
  | "invite.revoked"
  | "csv.imported"
  | "export.lgpd"
  | "session.nps";

export type AuditEntry = {
  trainerId: string;
  action: AuditAction;
  resourceId?: string | null;
  detail?: unknown;
  actorEmail?: string | null;
  request?: Request;
};

function getIp(request?: Request): string | null {
  if (!request) return null;
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0].trim() || request.headers.get("x-real-ip");
  return ip || null;
}

export async function audit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        trainerId: entry.trainerId,
        action: entry.action,
        resourceId: entry.resourceId ?? null,
        detail: entry.detail ? JSON.stringify(entry.detail) : null,
        actorEmail: entry.actorEmail ?? null,
        ipAddress: getIp(entry.request),
      },
    });
  } catch (error) {
    // Audit log nunca pode quebrar a request principal.
    console.error("[audit] falha ao gravar entrada", error);
  }
}
