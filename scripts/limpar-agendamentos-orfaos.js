// Remove agendamentos órfãos — eventos cujo CLIENTE foi excluído ANTES do fix do
// handler DELETE /api/clients (que agora apaga os agendamentos junto com o cliente).
//
// Um órfão é um CalendarEvent com:
//   - clientId nulo (o onDelete:SetNull zerou o vínculo ao excluir o cliente), E
//   - `client` (nome gravado) não-vazio E que não corresponde a nenhum cliente
//     atual do adestrador.
//
// Isso NÃO afeta: turmas/eventos coletivos (client = ""), nem agendamentos ainda
// ligados a um cliente existente (clientId preenchido).
//
// Uso (dry-run — só lista, não apaga):
//   node scripts/limpar-agendamentos-orfaos.js email-do-adestrador@exemplo.com
// Para apagar de verdade, acrescente --apply:
//   node scripts/limpar-agendamentos-orfaos.js email-do-adestrador@exemplo.com --apply

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  const apply = process.argv.includes("--apply");

  if (!email || email.startsWith("--")) {
    console.error(
      "Informe o e-mail do adestrador.\n" +
        "Ex: node scripts/limpar-agendamentos-orfaos.js email-do-adestrador@exemplo.com [--apply]",
    );
    process.exit(1);
  }

  const trainer = await prisma.trainer.findFirst({
    where: { user: { email } },
    select: { id: true, name: true },
  });
  if (!trainer) {
    console.error(`Adestrador não encontrado para o e-mail: ${email}`);
    process.exit(1);
  }

  const clients = await prisma.clientProfile.findMany({
    where: { trainerId: trainer.id },
    select: { name: true },
  });
  const currentNames = clients.map((c) => c.name);

  const orphans = await prisma.calendarEvent.findMany({
    where: {
      trainerId: trainer.id,
      clientId: null,
      AND: [{ client: { not: "" } }, { client: { notIn: currentNames } }],
    },
    select: { id: true, day: true, time: true, client: true, dog: true, status: true },
    orderBy: { day: "asc" },
  });

  console.log(`Adestrador: ${trainer.name} (${email})`);
  console.log(`Agendamentos órfãos encontrados: ${orphans.length}\n`);
  for (const ev of orphans) {
    console.log(`  • ${ev.day} ${ev.time} — ${ev.client} / ${ev.dog} [${ev.status}]`);
  }

  if (orphans.length === 0) {
    console.log("\nNada a remover. ✅");
    return;
  }

  if (!apply) {
    console.log(`\n(DRY-RUN) Nenhuma alteração feita. Rode de novo com --apply para remover os ${orphans.length}.`);
    return;
  }

  const result = await prisma.calendarEvent.deleteMany({
    where: { id: { in: orphans.map((o) => o.id) } },
  });
  console.log(`\n${result.count} agendamento(s) órfão(s) removido(s). ✅`);
}

main()
  .catch((err) => {
    console.error("Erro:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
