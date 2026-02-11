import crypto from "crypto";
import { cookies } from "next/headers";
import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf-constants";

function timingSafeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function requireCsrf(req: Request): Promise<Response | null> {
  const headerToken = req.headers.get(CSRF_HEADER) || "";
  const cookieStore = await cookies();
  const cookieToken = cookieStore.get(CSRF_COOKIE)?.value || "";

  if (!headerToken || !cookieToken) {
    return new Response(
      JSON.stringify({ error: "CSRF token missing" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!timingSafeEqual(headerToken, cookieToken)) {
    return new Response(
      JSON.stringify({ error: "Invalid CSRF token" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  return null;
}
