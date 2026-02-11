import { NextResponse } from "next/server";
import crypto from "crypto";
import { cookies } from "next/headers";
import { CSRF_COOKIE } from "@/lib/csrf-constants";

export async function GET() {
  const cookieStore = cookies();
  let token = cookieStore.get(CSRF_COOKIE)?.value;

  if (!token) {
    token = crypto.randomBytes(32).toString("hex");
  }

  const res = NextResponse.json({ csrfToken: token });
  res.cookies.set(CSRF_COOKIE, token, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return res;
}
