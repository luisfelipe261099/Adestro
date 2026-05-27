import { createHash } from "crypto";

import webpush from "web-push";

// VAPID keys são lidas do env. Gere uma vez com:
//   node -e "console.log(require('web-push').generateVAPIDKeys())"
// e cole em VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY na Vercel.

function getVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:adestro@adestro.app";
  if (!publicKey || !privateKey) return null;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return { publicKey, privateKey, subject };
}

export type WebPushPayload = {
  title: string;
  body?: string;
  url?: string;
  tag?: string;
  requireInteraction?: boolean;
};

export type Subscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export function hashEndpoint(endpoint: string): string {
  return createHash("sha256").update(endpoint).digest("hex");
}

export async function sendPush(subscription: Subscription, payload: WebPushPayload): Promise<{ ok: boolean; status?: number; error?: string }> {
  const keys = getVapidKeys();
  if (!keys) return { ok: false, error: "VAPID keys nao configuradas" };

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 },
    );
    return { ok: true };
  } catch (error) {
    const err = error as { statusCode?: number; message?: string };
    return { ok: false, status: err.statusCode, error: err.message };
  }
}

export function getVapidPublicKey(): string | null {
  return process.env.VAPID_PUBLIC_KEY ?? null;
}
