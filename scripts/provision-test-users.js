const bcrypt = require("bcryptjs");
const { PrismaClient, UserRole } = require("@prisma/client");

const prisma = new PrismaClient();

const USERS = {
  admin: {
    email: "juliana.admin@adestro.com.br",
    password: "Admin@2026",
    name: "Juliana Rocha",
    role: UserRole.ADMIN,
  },
  trainer: {
    email: "demo.real.adestrador@adestro.com.br",
    password: "Senha@123",
    name: "Carlos Mendes",
    role: UserRole.TRAINER,
    phone: "11976543210",
    plan: "Pro",
  },
  client: {
    email: "fernanda.tutora@adestro.com.br",
    password: "Tutor@2026",
    name: "Fernanda Oliveira",
    role: UserRole.CLIENT,
  },
};

async function upsertUser({ email, password, name, role }) {
  const hash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {
      password: hash,
      name,
      role,
    },
    create: {
      email,
      password: hash,
      name,
      role,
    },
  });
}

async function ensureTrainerProfile(userId) {
  return prisma.trainer.upsert({
    where: { userId },
    update: {
      name: USERS.trainer.name,
      phone: USERS.trainer.phone,
      plan: USERS.trainer.plan,
    },
    create: {
      userId,
      name: USERS.trainer.name,
      phone: USERS.trainer.phone,
      plan: USERS.trainer.plan,
    },
  });
}

async function ensureClientBinding(clientUserId, trainerId) {
  const clientAccount = await prisma.client.upsert({
    where: { userId: clientUserId },
    update: {},
    create: { userId: clientUserId },
  });

  const targetProfile = await prisma.clientProfile.findFirst({
    where: {
      trainerId,
      name: USERS.client.name,
    },
    select: {
      id: true,
      clientUserId: true,
    },
  });

  if (targetProfile) {
    await prisma.clientProfile.update({
      where: { id: targetProfile.id },
      data: { clientUserId: clientAccount.id },
    });
  }

  return { clientAccountId: clientAccount.id, linkedProfileId: targetProfile?.id ?? null };
}

async function main() {
  const adminUser = await upsertUser(USERS.admin);
  const trainerUser = await upsertUser(USERS.trainer);
  const clientUser = await upsertUser(USERS.client);

  const trainerProfile = await ensureTrainerProfile(trainerUser.id);
  const clientBinding = await ensureClientBinding(clientUser.id, trainerProfile.id);

  const summary = {
    admin: {
      email: USERS.admin.email,
      password: USERS.admin.password,
      name: USERS.admin.name,
      role: "ADMIN",
      userId: adminUser.id,
    },
    trainer: {
      email: USERS.trainer.email,
      password: USERS.trainer.password,
      name: USERS.trainer.name,
      role: "TRAINER",
      userId: trainerUser.id,
      trainerId: trainerProfile.id,
      plan: USERS.trainer.plan,
    },
    client: {
      email: USERS.client.email,
      password: USERS.client.password,
      name: USERS.client.name,
      role: "CLIENT",
      userId: clientUser.id,
      clientAccountId: clientBinding.clientAccountId,
      linkedProfileId: clientBinding.linkedProfileId,
    },
  };

  console.log("PROVISION_OK");
  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((error) => {
    console.error("PROVISION_ERROR", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
