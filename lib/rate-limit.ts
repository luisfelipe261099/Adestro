// Rate limiter in-memory (token bucket). Funciona no edge/serverless da Vercel
// porque cada função vive ~5min e o LRU evita crescer infinito.
// Não persiste — para algo robusto migrar para Upstash Redis (free tier).

type Bucket = { tokens: number; lastRefillMs: number };

const BUCKETS = new Map<string, Bucket>();
const MAX_KEYS = 5000;

export type RateLimitConfig = {
  // tokens por intervalo
  capacity: number;
  // intervalo em ms para repor 1 token
  refillIntervalMs: number;
};

const DEFAULT_CONFIG: RateLimitConfig = {
  capacity: 30,
  refillIntervalMs: 1000, // 30 req/seg em pico, ~1/seg sustained
};

export function getClientKey(request: Request, suffix = ""): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const realIp = request.headers.get("x-real-ip") ?? "";
  const ip = forwarded.split(",")[0].trim() || realIp || "unknown";
  return suffix ? `${ip}:${suffix}` : ip;
}

export function rateLimit(key: string, config: RateLimitConfig = DEFAULT_CONFIG): { allowed: boolean; remaining: number; retryAfterMs: number } {
  const now = Date.now();

  // Limpeza tosca quando o mapa cresce muito
  if (BUCKETS.size > MAX_KEYS) {
    const stale = Array.from(BUCKETS.entries())
      .sort((a, b) => a[1].lastRefillMs - b[1].lastRefillMs)
      .slice(0, Math.floor(MAX_KEYS / 4));
    for (const [k] of stale) BUCKETS.delete(k);
  }

  let bucket = BUCKETS.get(key);
  if (!bucket) {
    bucket = { tokens: config.capacity, lastRefillMs: now };
    BUCKETS.set(key, bucket);
  }

  const elapsed = now - bucket.lastRefillMs;
  const refill = Math.floor(elapsed / config.refillIntervalMs);
  if (refill > 0) {
    bucket.tokens = Math.min(config.capacity, bucket.tokens + refill);
    bucket.lastRefillMs += refill * config.refillIntervalMs;
  }

  if (bucket.tokens <= 0) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterMs: config.refillIntervalMs - (now - bucket.lastRefillMs),
    };
  }

  bucket.tokens -= 1;
  return { allowed: true, remaining: bucket.tokens, retryAfterMs: 0 };
}

// Helpers para rotas
export function requireRateLimit(request: Request, opts?: { suffix?: string; config?: RateLimitConfig }) {
  const key = getClientKey(request, opts?.suffix ?? "");
  const result = rateLimit(key, opts?.config);
  if (!result.allowed) {
    return new Response(
      JSON.stringify({ error: "Muitas requisicoes. Aguarde e tente novamente.", retryAfterMs: result.retryAfterMs }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil(result.retryAfterMs / 1000)),
        },
      },
    );
  }
  return null;
}
