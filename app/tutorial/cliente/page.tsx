"use client";

import { PageShell } from "@/components/page-shell";

const clientSteps = [
  {
    title: "Entrar no portal",
    goal: "Acessar o acompanhamento do cão com segurança.",
    details: [
      "Abra o link enviado pelo adestrador no WhatsApp, e-mail ou mensagem.",
      "Se aparecer um campo de PIN, digite o código informado pelo adestrador.",
      "Confira se o nome do cão e do tutor estão corretos antes de continuar.",
    ],
  },
  {
    title: "Ver o que precisa praticar",
    goal: "Entender exatamente qual exercício fazer em casa.",
    details: [
      "Leia a tarefa principal indicada pelo adestrador.",
      "Observe a frequência, duração e cuidado descritos na orientação.",
      "Faça treinos curtos para manter o cão motivado e evitar frustração.",
    ],
  },
  {
    title: "Marcar tarefas concluídas",
    goal: "Mostrar ao adestrador que a prática foi feita.",
    details: [
      "Depois de realizar o exercício, marque a tarefa como concluída.",
      "Se não conseguiu fazer, deixe para concluir apenas quando realmente praticar.",
      "Esse registro ajuda o adestrador a decidir o próximo passo da aula.",
    ],
  },
  {
    title: "Acompanhar evolução",
    goal: "Ver o progresso do cão entre uma aula e outra.",
    details: [
      "Confira anotações, fotos e histórico das sessões registradas.",
      "Veja quais comportamentos melhoraram e quais ainda precisam de atenção.",
      "Use essas informações para manter a família alinhada no mesmo método.",
    ],
  },
  {
    title: "Enviar avaliação da aula",
    goal: "Dar retorno para melhorar o acompanhamento.",
    details: [
      "Conte como o cão se comportou após a aula.",
      "Informe dúvidas, dificuldades ou situações que aconteceram em casa.",
      "Esse feedback ajuda o adestrador a ajustar o treino para a rotina real.",
    ],
  },
];

const goodPractices = [
  "Treine em momentos calmos, sem pressa e sem muita distração no começo.",
  "Use recompensas que o cão valorize, como petisco, brinquedo ou carinho.",
  "Pratique poucos minutos por vez; repetição curta costuma funcionar melhor.",
  "Não force o cão quando ele estiver cansado, assustado ou muito agitado.",
];

export default function ClientTutorialPage() {
  return (
    <PageShell
      kicker="Tutorial do tutor"
      title="Como acompanhar o treino pelo portal"
      description="Guia simples para o tutor entender tarefas, progresso, avaliações e rotina de prática em casa."
    >
      <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Visão geral</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">O portal é o caderno de treino do tutor</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Ele mostra o que foi combinado com o adestrador, quais exercícios devem ser feitos em casa e como o cão está evoluindo ao longo das aulas.
          </p>

          <div className="mt-5 grid gap-3">
            <div className="rounded-md border border-[var(--border)] bg-white p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Antes de começar</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Tenha o link do portal, o PIN caso exista e escolha um momento tranquilo para praticar com o cão.
              </p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-white p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Depois da prática</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Marque a tarefa feita e envie observações para o adestrador acompanhar o resultado fora da aula.
              </p>
            </div>
          </div>
        </aside>

        <section className="rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Passo a passo</p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Como usar no dia a dia</h2>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
              5 etapas
            </span>
          </div>

          <ol className="mt-5 grid gap-3">
            {clientSteps.map((step, index) => (
              <li key={step.title} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
                <div className="flex gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-sm font-semibold text-white">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-semibold text-[var(--foreground)]">{step.title}</h3>
                    <p className="mt-1 text-sm font-medium text-[var(--muted)]">{step.goal}</p>
                    <ul className="mt-3 grid gap-2">
                      {step.details.map((detail) => (
                        <li key={detail} className="flex gap-2 text-sm leading-6 text-[var(--muted)]">
                          <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#1f8e80]" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <section className="mt-4 rounded-lg border border-[var(--border)] bg-white p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Boas práticas</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">Como o tutor ajuda o cão a evoluir</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {goodPractices.map((practice) => (
            <div key={practice} className="rounded-md border border-[var(--border)] bg-[var(--panel)] p-4 text-sm leading-6 text-[var(--muted)]">
              {practice}
            </div>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
