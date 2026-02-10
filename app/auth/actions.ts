"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { auth, signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { triggerPresence } from "@/lib/pusher";
import { headers } from "next/headers";
import { checkRateLimit, loginLimit } from "@/lib/rate-limit";

export type AuthFormState = {
  success: boolean;
  errors?: {
    username?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    _form?: string;
  };
};

const defaultState: AuthFormState = {
  success: false,
  errors: {},
};

async function setOnlineByLogin(loginValue: string) {
  // aceita login por username ou email (mais robusto)
  const u = await prisma.user.findFirst({
    where: {
      OR: [{ username: loginValue }, { email: loginValue }],
    },
    select: { id: true },
  });

  if (!u) return null;

  const updated = await prisma.user.update({
    where: { id: u.id },
    data: {
      status: "ONLINE",
      lastSeen: new Date(),
    },
    select: { id: true, status: true, lastSeen: true },
  });

  return updated;
}

export async function registerAction(
  _prevState: AuthFormState = defaultState,
  formData: FormData
): Promise<AuthFormState> {
  const username = String(formData.get("username") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  const errors: AuthFormState["errors"] = {};

  if (!username) errors.username = "Informe um usuário.";

  if (!email) errors.email = "Informe um e-mail.";
  else if (!email.includes("@") || !email.includes("."))
    errors.email = "E-mail inválido.";

  if (password.length < 6)
    errors.password = "A senha deve ter pelo menos 6 caracteres.";

  if (password !== confirmPassword)
    errors.confirmPassword = "As senhas não coincidem.";

  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }

  const existingByUsername = await prisma.user.findUnique({
    where: { username },
  });
  if (existingByUsername) {
    return {
      success: false,
      errors: { username: "Já existe um usuário com esse nome." },
    };
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { email },
  });
  if (existingByEmail) {
    return {
      success: false,
      errors: { email: "Já existe uma conta com esse e-mail." },
    };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      username,
      email,
      name: username,
      passwordHash,
      status: "ONLINE",
      lastSeen: new Date(),
    },
  });

  // já loga
  try {
    await signIn("credentials", {
      redirect: false,
      username,
      password,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return {
        success: false,
        errors: { _form: "Erro ao fazer login após o registro." },
      };
    }
    throw error;
  }

  // garante presença online (redundante com create, mas ok)
  const online = await setOnlineByLogin(username);
  if (online) {
    try {
      await triggerPresence(online.id, "ONLINE", online.lastSeen);
    } catch (err) {
      console.error("[auth] Pusher trigger failed:", err);
    }
  }

  redirect("/");
}

export async function loginAction(
  _prevState: AuthFormState = defaultState,
  formData: FormData
): Promise<AuthFormState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return {
      success: false,
      errors: { _form: "Informe usuário e senha." },
    };
  }

  const req = new Request("http://local/login", {
    headers: new Headers(headers()),
  });
  const limit = await checkRateLimit(req, loginLimit);
  if (!limit.success) {
    return {
      success: false,
      errors: { _form: "Muitas tentativas. Tente novamente em alguns minutos." },
    };
  }

  try {
    await signIn("credentials", {
      redirect: false,
      username,
      password,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      if (error.type === "CredentialsSignin") {
        return {
          success: false,
          errors: { _form: "Usuário ou senha inválidos." },
        };
      }

      return {
        success: false,
        errors: { _form: "Erro ao fazer login, tente novamente." },
      };
    }

    throw error;
  }

  // ✅ login ok -> marca ONLINE no banco
  const online = await setOnlineByLogin(username);
  if (online) {
    try {
      await triggerPresence(online.id, "ONLINE", online.lastSeen);
    } catch (err) {
      console.error("[auth] Pusher trigger failed:", err);
    }
  }

  redirect("/");
}

export async function logoutAction() {
  const session = await auth();
  const meId = (session?.user as any)?.id as string | undefined;

  if (meId) {
    const updated = await prisma.user.update({
      where: { id: meId },
      data: {
        status: "OFFLINE",
        lastSeen: new Date(),
      },
      select: { id: true, status: true, lastSeen: true },
    });

    try {
      await triggerPresence(updated.id, "OFFLINE", updated.lastSeen);
    } catch (err) {
      console.error("[auth] Pusher trigger failed:", err);
    }
  }

  // evita redirect absoluto via AUTH_URL incorreto
  await signOut({ redirect: false });
  redirect("/");
}
