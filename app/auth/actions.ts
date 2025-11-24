"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signIn, signOut } from "@/auth";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";  // <--- ADICIONAR


export type AuthFormState = {
  success: boolean;
  errors?: {
    username?: string;
    password?: string;
    confirmPassword?: string;
    _form?: string;
  };
};

const defaultState: AuthFormState = {
  success: false,
  errors: {},
};


export async function registerAction(
  _prevState: AuthFormState = defaultState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = String(formData.get("username") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const confirmPassword = String(formData.get("confirmPassword") || "");

  const errors: AuthFormState["errors"] = {};

  if (!username) {
    errors.username = "Informe um usuário.";
  }

  if (!email) {
    errors.email = "Informe um e-mail.";
  } else if (!email.includes("@") || !email.includes(".")) {
    errors.email = "E-mail inválido.";
  }

  if (password.length < 6) {
    errors.password = "A senha deve ter pelo menos 6 caracteres.";
  }

  if (password !== confirmPassword) {
    errors.confirmPassword = "As senhas não coincidem.";
  }

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
    },
  });

  // já loga e redireciona manualmente
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

  // se chegou aqui, login deu certo
  redirect("/");
}


export async function loginAction(
  _prevState: AuthFormState = defaultState,
  formData: FormData,
): Promise<AuthFormState> {
  const username = String(formData.get("username") || "").trim();
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return {
      success: false,
      errors: { _form: "Informe usuário e senha." },
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

  // login ok → redireciona pra home (ou /lobbies se preferir)
  redirect("/");
}


export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export type AuthFormState = {
  success: boolean;
  errors?: {
    username?: string;
    email?: string;           // <--- novo
    password?: string;
    confirmPassword?: string;
    _form?: string;
  };
};