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

/**
 * Versão "estrita": retorna `null` quando o role ainda NÃO é confiável
 * (undefined / "" / desconhecido). Use no redirect pós-login e na auto-cura do
 * AuthGuard para NUNCA navegar com role indefinido — o que mandaria todo mundo
 * para o default /dashboard (página só-trainer) e derrubaria admin/cliente.
 */
export function homeRouteForRoleStrict(role?: UserRole | string | null): string | null {
  switch ((role ?? "").toLowerCase()) {
    case "admin":
      return "/admin";
    case "client":
      return "/portal/cliente";
    case "trainer":
      return "/dashboard";
    default:
      return null;
  }
}
