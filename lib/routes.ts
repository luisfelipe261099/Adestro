import type { UserRole } from "@/lib/app-store";

/**
 * Página inicial (home) de cada perfil — usada no redirect pós-login e ao
 * clicar no logo. Fonte única de verdade para evitar mandar um perfil para uma
 * página cujo guard exige outro perfil (ex.: tutor caía em /portal, que é
 * protegido por role="trainer").
 *
 * Aceita string solta porque o role vem da sessão (NextAuth) podendo estar em
 * MAIÚSCULAS (enum UserRole do Prisma) — normalizamos com toLowerCase().
 */
export function homeRouteForRole(role?: UserRole | string | null): string {
  switch ((role ?? "").toLowerCase()) {
    case "admin":
      return "/admin";
    case "client":
      return "/portal/cliente";
    case "trainer":
    default:
      return "/dashboard";
  }
}
