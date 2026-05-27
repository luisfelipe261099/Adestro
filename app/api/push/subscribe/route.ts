import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { hashEndpoint, getVapidPublicKey } from "@/lib/push";
import { prisma } from "@/lib/prisma";
import { pushSubscriptionSchema, badRequest } from "@/lib/validators";

export async function GET() {
  return NextResponse.json({ vapidPublicKey: getVapidPublicKey() });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!trainer) return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });

  const body = await request.json();
  const parsed = pushSubscriptionSchema.safeParse(body);
  if (!parsed.success) return badRequest("Subscription invalida", parsed.error.flatten());

  const { endpoint, keys } = parsed.data;
  const endpointHash = hashEndpoint(endpoint);
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  await prisma.pushSubscription.upsert({
    where: {
      trainerId_endpointHash: { trainerId: trainer.id, endpointHash },
    },
    update: {
      endpoint,
      p256dh: keys.p256dh,
      authKey: keys.auth,
      userAgent,
      lastUsedAt: new Date(),
    },
    create: {
      trainerId: trainer.id,
      endpointHash,
      endpoint,
      p256dh: keys.p256dh,
      authKey: keys.auth,
      userAgent,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });

  const trainer = await prisma.trainer.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!trainer) return NextResponse.json({ error: "Adestrador nao encontrado" }, { status: 404 });

  const body = (await request.json()) as { endpoint?: string };
  if (!body.endpoint) return badRequest("endpoint obrigatorio");

  await prisma.pushSubscription.deleteMany({
    where: { trainerId: trainer.id, endpointHash: hashEndpoint(body.endpoint) },
  });

  return NextResponse.json({ ok: true });
}
