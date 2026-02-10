import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// =============================
// CONFIGURAÇÃO REDIS
// =============================
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL || "",
  token: process.env.UPSTASH_REDIS_REST_TOKEN || "",
});

// =============================
// RATE LIMITERS
// =============================

/**
 * Rate limiter para envio de mensagens DM
 * Limite: 20 mensagens por minuto por usuário/IP
 */
export const dmRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "1 m"),
  analytics: true,
  prefix: "rl:dm",
});

/**
 * Rate limiter para pedidos de amizade
 * Limite: 5 pedidos por hora por usuário
 */
export const friendRequestLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "1 h"),
  analytics: true,
  prefix: "rl:friend",
});

/**
 * Rate limiter para tentativas de login
 * Limite: 5 tentativas em 15 minutos por IP
 */
export const loginLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "15 m"),
  analytics: true,
  prefix: "rl:login",
});

/**
 * Rate limiter para criação de lobbies
 * Limite: 3 lobbies por hora por usuário
 */
export const lobbyCreateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, "1 h"),
  analytics: true,
  prefix: "rl:lobby",
});

/**
 * Rate limiter para mudança de status
 * Limite: 10 mudanças por minuto por usuário
 */
export const statusChangeLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
  prefix: "rl:status",
});

/**
 * Rate limiter genérico para APIs
 * Limite: 100 requisições por minuto por IP
 */
export const apiRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, "1 m"),
  analytics: true,
  prefix: "rl:api",
});

// =============================
// HELPERS
// =============================

/**
 * Extrai IP do request (Vercel-friendly)
 */
export function getClientIP(req: Request): string {
  // Vercel envia o IP real em x-forwarded-for
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  // Fallback para x-real-ip
  const realIp = req.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback genérico
  return "127.0.0.1";
}

/**
 * Helper para aplicar rate limit e retornar resposta padronizada
 * 
 * @example
 * ```ts
 * export async function POST(req: Request) {
 *   const limitResult = await checkRateLimit(req, dmRateLimit);
 *   if (!limitResult.success) return limitResult.response;
 *   
 *   // ... código normal
 * }
 * ```
 */
export async function checkRateLimit(
  req: Request,
  limiter: Ratelimit,
  identifier?: string
) {
  const ip = getClientIP(req);
  const key = identifier || ip;

  const { success, limit, remaining, reset } = await limiter.limit(key);

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);

    return {
      success: false,
      response: new Response(
        JSON.stringify({
          error: "Muitas requisições. Tente novamente mais tarde.",
          retryAfter,
          limit,
          remaining: 0,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": reset.toString(),
            "Retry-After": retryAfter.toString(),
          },
        }
      ),
    };
  }

  return {
    success: true,
    remaining,
    limit,
    reset,
  };
}