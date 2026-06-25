const bcrypt = require("bcryptjs");
const { PrismaClient, UserRole } = require("@prisma/client");

const prisma = new PrismaClient();

const LOGIN_EMAIL = "demo.real.adestrador@adestro.com.br";
const LOGIN_PASSWORD = "Senha@123";

const TRAINER_NAME = "Carlos Mendes";
const TRAINER_PHONE = "11976543210";

const CLIENT_NAME = "Fernanda Oliveira";
const CLIENT_PHONE = "11999888777";
const DOG_NAME = "Bolt";

async function cleanupPreviousSample(trainerId) {
  const sampleClients = await prisma.clientProfile.findMany({
    where: { trainerId, name: CLIENT_NAME },
    select: { id: true },
  });

  const sampleClientIds = sampleClients.map((c) => c.id);

  await prisma.trainingSession.deleteMany({
    where: {
      trainerId,
      OR: [{ clientName: CLIENT_NAME }, { dogName: DOG_NAME }],
    },
  });

  await prisma.calendarEvent.deleteMany({
    where: {
      trainerId,
      OR: [{ client: CLIENT_NAME }, { dog: DOG_NAME }, { clientId: { in: sampleClientIds } }],
    },
  });

  if (sampleClientIds.length) {
    await prisma.portalAccessLink.deleteMany({ where: { clientId: { in: sampleClientIds } } });
    await prisma.clientGamification.deleteMany({ where: { clientId: { in: sampleClientIds } } });
    await prisma.portalTask.deleteMany({ where: { clientId: { in: sampleClientIds } } });
    await prisma.portalFeedback.deleteMany({ where: { clientId: { in: sampleClientIds } } });
    await prisma.dog.deleteMany({ where: { clientId: { in: sampleClientIds } } });
    await prisma.clientProfile.deleteMany({ where: { id: { in: sampleClientIds } } });
  }
}

async function main() {
  const hashedPassword = await bcrypt.hash(LOGIN_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: LOGIN_EMAIL },
    update: {
      name: TRAINER_NAME,
      role: UserRole.TRAINER,
      password: hashedPassword,
    },
    create: {
      email: LOGIN_EMAIL,
      password: hashedPassword,
      name: TRAINER_NAME,
      role: UserRole.TRAINER,
    },
  });

  const trainer = await prisma.trainer.upsert({
    where: { userId: user.id },
    update: {
      name: TRAINER_NAME,
      phone: TRAINER_PHONE,
      plan: "Pro",
    },
    create: {
      userId: user.id,
      name: TRAINER_NAME,
      phone: TRAINER_PHONE,
      plan: "Pro",
    },
  });

  await cleanupPreviousSample(trainer.id);

  const client = await prisma.clientProfile.create({
    data: {
      trainerId: trainer.id,
      name: CLIENT_NAME,
      phone: CLIENT_PHONE,
      propertyType: "Apartamento",
      environment: "Mora em apartamento com rotina de trabalho híbrida e passeios no fim da tarde.",
      plan: "Plano Pro - 8 aulas",
      dogs: {
        create: {
          name: DOG_NAME,
          breed: "Labrador",
          age: "1 ano e 8 meses",
          weight: "28 kg",
          photoUrl: "https://images.dog.ceo/breeds/labrador/n02099712_6856.jpg",
          trainingTypes: JSON.stringify(["Obediencia", "Passeio sem puxar", "Controle de ansiedade"]),
        },
      },
    },
    include: { dogs: true },
  });

  const dog = client.dogs[0];

  await prisma.trainingSession.createMany({
    data: [
      {
        trainerId: trainer.id,
        dogId: dog.id,
        number: 1,
        title: "Avaliacao inicial e comandos base",
        date: "03/05/2026",
        clientName: client.name,
        dogName: dog.name,
        notes: JSON.stringify([
          {
            block: "Avaliacao",
            score: 6,
            comment: "Bolt apresentou alta excitacao no inicio, mas respondeu bem ao reforco alimentar.",
          },
          {
            block: "Comandos base",
            score: 7,
            comment: "Senta e deita com boa resposta em ambiente controlado.",
          },
        ]),
        media: JSON.stringify([]),
      },
      {
        trainerId: trainer.id,
        dogId: dog.id,
        number: 2,
        title: "Passeio guiado e foco em distracoes",
        date: "07/05/2026",
        clientName: client.name,
        dogName: dog.name,
        notes: JSON.stringify([
          {
            block: "Passeio",
            score: 8,
            comment: "Reduziu puxoes em 60% com tecnica de troca de direcao.",
          },
          {
            block: "Distracoes",
            score: 7,
            comment: "Manteve contato visual por mais tempo perto de outros caes.",
          },
        ]),
        media: JSON.stringify([]),
      },
      {
        trainerId: trainer.id,
        dogId: dog.id,
        number: 3,
        title: "Consolidacao e rotina em casa",
        date: "11/05/2026",
        clientName: client.name,
        dogName: dog.name,
        notes: JSON.stringify([
          {
            block: "Rotina",
            score: 8,
            comment: "Tutor aplicou corretamente exercicios de espera antes da porta.",
          },
          {
            block: "Controle emocional",
            score: 8,
            comment: "Menor reatividade na chegada de visitas.",
          },
        ]),
        media: JSON.stringify([]),
      },
    ],
  });

  await prisma.calendarEvent.createMany({
    data: [
      {
        trainerId: trainer.id,
        clientId: client.id,
        dogId: dog.id,
        day: "Quinta",
        time: "10:00",
        dog: dog.name,
        client: client.name,
        plan: "Aula 4 de 8",
        sessionNumber: 4,
        status: "Pendente",
      },
      {
        trainerId: trainer.id,
        clientId: client.id,
        dogId: dog.id,
        day: "Sabado",
        time: "09:30",
        dog: dog.name,
        client: client.name,
        plan: "Aula 5 de 8",
        sessionNumber: 5,
        status: "Recorrente",
      },
    ],
  });

  await prisma.portalTask.createMany({
    data: [
      {
        trainerId: trainer.id,
        clientId: client.id,
        title: "Espera antes de abrir a porta",
        description: "3 repeticoes curtas antes de cada passeio, reforcando calma.",
        completed: true,
      },
      {
        trainerId: trainer.id,
        clientId: client.id,
        title: "Passeio com pausas de foco",
        description: "Caminhar 15 minutos com 4 pausas para contato visual e recompensa.",
        completed: false,
      },
    ],
  });

  await prisma.portalFeedback.createMany({
    data: [
      {
        trainerId: trainer.id,
        clientId: client.id,
        author: "Tutor",
        message: "Bolt melhorou bastante no elevador e no corredor do predio.",
      },
      {
        trainerId: trainer.id,
        clientId: client.id,
        author: "Adestrador",
        message: "Excelente evolucao. Vamos aumentar gradualmente o nivel de distracao na rua.",
      },
    ],
  });

  await prisma.clientGamification.create({
    data: {
      trainerId: trainer.id,
      clientId: client.id,
      points: 185,
      streakDays: 6,
      lastVisitDate: "2026-05-14",
      trainerRating: 5,
      totalTasksCompleted: 1,
      totalFeedbacks: 1,
      watchedVideos: JSON.stringify(["sessao-2-video-1", "sessao-3-video-1"]),
      sessionRatings: JSON.stringify({
        "sessao-1": 4,
        "sessao-2": 5,
      }),
    },
  });

  await prisma.payment.create({
    data: {
      trainerId: trainer.id,
      description: "Assinatura Pro",
      amount: 319,
      status: "Pago",
      paymentMethod: "Pix",
      dueDate: "14/06/2026",
      reference: "Pro • 8 aulas",
    },
  });

  await prisma.subscriptionRenewal.create({
    data: {
      trainerId: trainer.id,
      planName: "Pro",
      lessonPackage: "8 aulas",
      paymentMethod: "Pix",
      amount: 319,
      status: "Pago",
      reference: "Pro • 8 aulas",
      dueDate: "14/06/2026",
    },
  });

  console.log("OK_SEED_REAL_DATA");
  console.log(JSON.stringify({
    login: {
      email: LOGIN_EMAIL,
      password: LOGIN_PASSWORD,
    },
    trainer: {
      id: trainer.id,
      name: trainer.name,
    },
    client: {
      id: client.id,
      name: client.name,
    },
    dog: {
      id: dog.id,
      name: dog.name,
    },
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("SEED_ERROR", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
