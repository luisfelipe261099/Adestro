import { PageShell } from "@/components/page-shell";
import { AdminContextNav } from "@/components/admin-context-nav";
import { AdminDashboard } from "./admin-client";

export default function AdminPage() {
  return (
    <PageShell
      kicker="Admin"
      title="Administrativo"
      description="Acompanhe a operação e gerencie adestradores, planos, faturamento e relatórios em um só lugar."
      requireAuth="admin"
    >
      <AdminContextNav />
      <AdminDashboard />
    </PageShell>
  );
}
