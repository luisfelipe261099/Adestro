import { createHash, randomBytes } from "crypto";

export const PORTAL_LINK_DEFAULT_DAYS = 90;
export const PORTAL_LINK_MIN_DAYS = 1;
export const PORTAL_LINK_MAX_DAYS = 365;

export function normalizeExpiresInDays(value?: number): number {
  if (!Number.isFinite(value)) return PORTAL_LINK_DEFAULT_DAYS;
  const rounded = Math.round(Number(value));
  return Math.min(PORTAL_LINK_MAX_DAYS, Math.max(PORTAL_LINK_MIN_DAYS, rounded));
}

export function buildPortalToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashPortalToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function normalizePortalPin(pin?: string): string | null {
  if (!pin) return null;
  const onlyDigits = String(pin).replace(/\D/g, "");
  if (onlyDigits.length !== 4) return null;
  return onlyDigits;
}

export function hashPortalPin(pin: string): string {
  return createHash("sha256").update(`portal-pin:${pin}`).digest("hex");
}

export function isPortalPinValid(pinHash: string | null, pin?: string): boolean {
  if (!pinHash) return true;
  const normalized = normalizePortalPin(pin);
  if (!normalized) return false;
  return hashPortalPin(normalized) === pinHash;
}

export function getTokenPrefix(token: string): string {
  return token.slice(0, 10);
}

export function getPortalExpiryDate(days: number): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + normalizeExpiresInDays(days));
  return expiresAt;
}

export function getPortalLinkStatus(params: {
  revokedAt: Date | null;
  expiresAt: Date;
}): "Ativo" | "Revogado" | "Expirado" {
  if (params.revokedAt) return "Revogado";
  if (params.expiresAt.getTime() <= Date.now()) return "Expirado";
  return "Ativo";
}

export function isPortalTokenActive(params: {
  revokedAt: Date | null;
  expiresAt: Date;
}): boolean {
  return getPortalLinkStatus(params) === "Ativo";
}
