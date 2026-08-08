"use client";

import { PageShell } from "@/components/page-shell";

const clientSteps = [
  {
    title: "Fazer seu cadastro pelo link de convite",
    goal: "Entrar no sistema do adestrador sem precisar de conta nem senha.",
    details: [
      "O adestrador manda um link de convite. São três partes: seus dados, os dados do cão e algumas perguntas sobre o comportamento dele.",
      "No endereço, digite só o CEP: rua, bairro, cidade e estado se preenchem sozinhos. Você completa o número.",
      "Cada 'Avançar' já salva. Sem tempo agora? Feche a página — ao reabrir o mesmo link, você volta exatamente onde parou, mesmo em outro celular.",
      "As perguntas de comportamento existem para o adestrador preparar a primeira aula com segurança: como o cão reage a crianças, a barulhos, se já mordeu, se protege comida ou brinquedo.",
      "Ao terminar, guarde o link do seu portal. Se perder, reabra o link do convite nos primeiros dias que ele te leva de volta.",
      "O convite vence (7 dias, em geral) e serve uma vez. Depois disso, peça um link novo ao adestrador.",
    ],
  },
  {
    title: "Entrar no portal",
    goal: "Acessar o acompanhamento do cão com segurança.",
    details: [
      "Abra o link enviado pelo adestrador no WhatsApp, e-mail ou mensagem.",
      "Se aparecer um campo de PIN, digite o código informado pelo adestrador.",
      "Confira se o nome do cão e do cliente estão corretos antes de continuar.",
      "Perdeu o link? Peça um novo ao adestrador — ele gera outro em segundos.",
    ],
  },
  {
    title: "Confirmar presença na próxima aula",
    goal: "Avisar o adestrador se o cão vai comparecer.",
    details: [
      "Quando houver aula marcada, um aviso azul de 'Confirmar presença' aparece no topo do portal.",
      "Toque em confirmar (ou avise que não poderá ir, informando o motivo se quiser).",
      "A confirmação chega na hora para o adestrador e evita aulas perdidas.",
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
      "Se quiser, envie uma foto do treino junto — o adestrador adora ver.",
      "Se não conseguiu fazer, deixe para concluir apenas quando realmente praticar.",
      "Esse registro ajuda o adestrador a decidir o próximo passo da aula.",
    ],
  },
  {
    title: "Acompanhar evolução e conquistas",
    goal: "Ver o progresso do cão entre uma aula e outra.",
    details: [
      "Confira anotações, fotos e histórico das sessões registradas.",
      "Em 'Evolução' de cada aula você vê os exercícios trabalhados agrupados por categoria (Fundamentos, Obediência, Socialização, Comportamento, Manejo & Rotina), cada um com estrelas de 1 a 5 e a média da categoria.",
      "As estrelas são do exercício em si — 'Recall ★★☆☆☆' diz exatamente o que ainda precisa de treino, e a média da categoria mostra o quadro geral.",
      "No relatório mensal, o bloco 'O que foi trabalhado' resume as mesmas categorias no período inteiro.",
      "O cão sobe de nível conforme pratica, e a sequência diária 🔥 mostra a constância da rotina.",
      "Complete tarefas para ganhar medalhas (badges) — é um jeito divertido de manter a família engajada.",
      "Veja quais comportamentos melhoraram e quais ainda precisam de atenção.",
    ],
  },
  {
    title: "Falar com o adestrador",
    goal: "Tirar dúvidas sem esperar a próxima aula.",
    details: [
      "Use o chat no fim da página do portal para mandar dúvidas e recados.",
      "As respostas do adestrador aparecem ali mesmo, em tempo real.",
      "Conte situações do dia a dia (visitas, passeios, latidos) — isso ajuda a ajustar o treino.",
    ],
  },
  {
    title: "Enviar avaliação da aula",
    goal: "Dar retorno para melhorar o acompanhamento.",
    details: [
      "Depois de cada aula, avalie o treino com estrelas quando o portal pedir.",
      "Conte como o cão se comportou após a aula.",
      "Esse feedback ajuda o adestrador a ajustar o treino para a rotina real.",
    ],
  },
];

const goodPractices = [
  "Treine em momentos calmos, sem pressa e sem muita distração no começo.",
  "Use recompensas que o cão valorize, como petisco, brinquedo ou carinho.",
  "Pratique poucos minutos por vez; repetição curta costuma funcionar melhor.",
  "Não force o cão quando ele estiver cansado, assustado ou muito agitado.",
  "Mantenha a família toda no mesmo método — comandos diferentes confundem o cão.",
  "Abra o portal todo dia: a sequência diária 🔥 ajuda a criar o hábito.",
];

const clientFaq = [
  {
    q: "Preciso criar conta ou senha?",
    a: "Não. O acesso é pelo link único que o adestrador envia. Se ele configurou um PIN, basta digitá-lo ao abrir.",
  },
  {
    q: "O link parou de funcionar",
    a: "O link pode ter expirado ou sido renovado. Peça um novo ao adestrador pelo WhatsApp.",
  },
  {
    q: "Fechei a página logo depois do cadastro e perdi o link do portal",
    a: "Abra de novo o link de convite que você recebeu: enquanto ele estiver válido, leva direto ao seu portal. Se já tiver vencido, peça um link novo ao adestrador.",
  },
  {
    q: "Me cadastrei e o adestrador disse que não apareceu",
    a: "Todo cadastro feito pelo convite chega como rascunho e precisa da conferência do adestrador. Assim que ele aprovar, tudo passa a funcionar normalmente.",
  },
  {
    q: "Funciona no celular?",
    a: "Sim, o portal foi feito para o celular. Você pode salvar o link nos favoritos ou usar 'Adicionar à tela inicial' para abrir como aplicativo.",
  },
  {
    q: "O que significam as estrelas de cada exercício?",
    a: "É a avaliação daquele exercício específico naquele dia: 1 estrela = está começando, 5 estrelas = o cão respondeu muito bem. Como cada exercício tem a própria nota, dá pra ver o que já está firme e o que ainda precisa de repetição em casa.",
  },
  {
    q: "Quem vê o que eu escrevo no chat?",
    a: "Somente o seu adestrador. As anotações técnicas confidenciais dele também não aparecem para você — cada um vê o que precisa.",
  },
  {
    q: "Marquei uma tarefa sem querer",
    a: "Sem problema: toque de novo para desmarcar, ou avise o adestrador pelo chat.",
  },
  {
    q: "Tem modo claro?",
    a: "O portal já abre no modo escuro. Se preferir claro, toque no ícone ☀️ no topo da página — a escolha fica salva no seu aparelho.",
  },
];

export default function ClientTutorialPage() {
  return (
    <PageShell
      kicker="Tutorial do cliente"
      title="Como acompanhar o treino pelo portal"
      description="Guia simples para o cliente entender tarefas, progresso, avaliações e rotina de prática em casa."
    >
      <div className="grid gap-4 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Visão geral</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">O portal é o caderno de treino do cliente</h2>
          <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
            Ele mostra o que foi combinado com o adestrador, quais exercícios foram trabalhados na aula (com estrelas por exercício), o que deve ser feito em casa e como o cão está evoluindo ao longo das aulas.
          </p>

          <div className="mt-5 grid gap-3">
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Antes de começar</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Tenha o link do portal, o PIN caso exista e escolha um momento tranquilo para praticar com o cão.
              </p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Depois da prática</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                Marque a tarefa feita e envie observações para o adestrador acompanhar o resultado fora da aula.
              </p>
            </div>
            <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">Dentro do portal</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
                O botão ✨ “Como usar”, no topo do portal, mostra um tour rápido apontando cada área na própria tela.
              </p>
            </div>
          </div>
        </aside>

        <section className="rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Passo a passo</p>
              <h2 className="mt-1 text-2xl font-semibold text-[var(--foreground)]">Como usar no dia a dia</h2>
            </div>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--foreground)]">
              {clientSteps.length} etapas
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

      <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Boas práticas</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">Como o cliente ajuda o cão a evoluir</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {goodPractices.map((practice) => (
            <div key={practice} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted)]">
              {practice}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-[var(--border)] bg-[var(--panel)] p-5 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Dúvidas frequentes</p>
        <h2 className="mt-1 text-xl font-semibold text-[var(--foreground)]">Perguntas comuns</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {clientFaq.map((item) => (
            <article key={item.q} className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-4">
              <p className="text-sm font-semibold text-[var(--foreground)]">{item.q}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{item.a}</p>
            </article>
          ))}
        </div>
      </section>
    </PageShell>
  );
}
