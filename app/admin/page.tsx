import { PageShell } from "@/components/page-shell";
import { AdminContextNav } from "@/components/admin-context-nav";
import { AdminDashboard } from "./admin-client";

export default function AdminPage() {
  return (
    <PageShell
      kicker="Admin"
      title="Administrativo"
      description="Acompanhe a operacao e gerencie adestradores, planos, faturamento e relatorios em um so lugar."
      requireAuth="admin"
    >
      <AdminContextNav />
      <AdminDashboard />
    </PageShell>
  );
}
