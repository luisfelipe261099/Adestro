const { createHash, randomBytes } = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const TRAINER_EMAIL = "demo.real.adestrador@adestro.com.br";
const CLIENT_NAME = "Fernanda Oliveira";
const EXPIRES_IN_DAYS = 90;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";

function buildPortalToken() {
  return randomBytes(32).toString("hex");
}

function hashPortalToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

function getTokenPrefix(token) {
  return token.slice(0, 10);
}

function getExpiryDate(days) {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + days);
  return expiresAt;
}

async function main() {
  const trainerUser = await prisma.user.findUnique({
    where: { email: TRAINER_EMAIL },
    select: { id: true },
  });

  if (!trainerUser) {
    throw new Error(`Adestrador nao encontrado para email: ${TRAINER_EMAIL}`);
  }

  const trainer = await prisma.trainer.findUnique({
    where: { userId: trainerUser.id },
    select: { id: true },
  });

  if (!trainer) {
    throw new Error("Registro de trainer nao encontrado para este usuario.");
  }

  const client = await prisma.clientProfile.findFirst({
    where: {
      trainerId: trainer.id,
      name: CLIENT_NAME,
    },
    select: { id: true, name: true },
  });

  if (!client) {
    throw new Error(`Cliente nao encontrado para este adestrador: ${CLIENT_NAME}`);
  }

  const token = buildPortalToken();
  const tokenHash = hashPortalToken(token);
  const tokenPrefix = getTokenPrefix(token);
  const expiresAt = getExpiryDate(EXPIRES_IN_DAYS);

  await prisma.portalAccessLink.upsert({
    where: { clientId: client.id },
    update: {
      trainerId: trainer.id,
      tokenHash,
      pinHash: null,
      tokenPrefix,
      expiresAt,
      revokedAt: null,
    },
    create: {
      trainerId: trainer.id,
      clientId: client.id,
      tokenHash,
      pinHash: null,
      tokenPrefix,
      expiresAt,
    },
  });

  const shareUrl = `${BASE_URL}/portal/cliente/${token}`;

  console.log("PORTAL_LINK_OK");
  console.log(JSON.stringify({
    trainerEmail: TRAINER_EMAIL,
    clientName: client.name,
    expiresAt: expiresAt.toISOString(),
    shareUrl,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error("PORTAL_LINK_ERROR", error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
