import { PageShell } from "@/components/page-shell";
import { AdminContextNav } from "@/components/admin-context-nav";
import { AdestradoresClient } from "./adestradores-client";

export default function AdestradoresPage() {
  return (
    <PageShell
      kicker="Admin"
      title="Adestradores"
      description="Cadastre novos adestradores e ajuste plano e status das contas de forma rapida."
      requireAuth="admin"
    >
      <AdminContextNav />
      <AdestradoresClient />
    </PageShell>
  );
}
