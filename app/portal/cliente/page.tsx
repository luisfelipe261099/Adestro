import { PageShell } from "@/components/page-shell";

export default function PortalClientePage() {
  return (
    <PageShell
      kicker="Portal do cliente"
      title="Acesso por link individual"
      description="Este portal agora funciona sem login, com um link unico gerado pelo adestrador para cada cliente."
    >
      <section className="rounded-md border border-[var(--border)] bg-white p-6">
        <h2 className="text-2xl font-semibold">Como acessar</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted)]">
          Solicite ao adestrador o seu link exclusivo. Ao abrir o link completo, voce acessa o portal
          diretamente com suas tarefas, agenda e acompanhamento do caso.
        </p>
      </section>
    </PageShell>
  );
}
