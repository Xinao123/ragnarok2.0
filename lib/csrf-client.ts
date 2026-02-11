"use client";

import { CSRF_COOKIE, CSRF_HEADER } from "@/lib/csrf-constants";

let cachedToken: string | null = null;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const value = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
  return value ? decodeURIComponent(value) : null;
}

export async function getCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;

  const fromCookie = readCookie(CSRF_COOKIE);
  if (fromCookie) {
    cachedToken = fromCookie;
    return fromCookie;
  }

  const res = await fetch("/api/csrf", { method: "GET" });
  const data = (await res.json()) as { csrfToken?: string };
  const token = data?.csrfToken || "";
  cachedToken = token;
  return token;
}

export async function withCsrf(init: RequestInit = {}) {
  const token = await getCsrfToken();
  const headers = new Headers(init.headers || {});
  headers.set(CSRF_HEADER, token);
  return { ...init, headers };
}
