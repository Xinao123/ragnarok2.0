"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerAction, type AuthFormState } from "../actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: AuthFormState = {
  success: false,
  errors: {},
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Enviando..." : label}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialState);

  return (
    <form
      action={formAction}
      className="space-y-4 max-w-sm w-full mx-auto border border-slate-800 bg-slate-900/70 rounded-xl p-5"
    >
      <h1 className="text-lg font-semibold text-center mb-2">
        Criar conta Ragnarok
      </h1>

      {/* Usuário */}
      <div className="space-y-1">
        <label className="text-xs text-slate-200" htmlFor="username">
          Usuário
        </label>
        <Input
          id="username"
          name="username"
          placeholder="ex: samoanomestre"
          className="bg-slate-950/60 border-slate-700"
          required
        />
        {state.errors?.username && (
          <p className="text-[11px] text-red-400">{state.errors.username}</p>
        )}
      </div>

      {/* Email */}
      <div className="space-y-1">
        <label className="text-xs text-slate-200" htmlFor="email">
          E-mail
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          placeholder="ex: voce@exemplo.com"
          className="bg-slate-950/60 border-slate-700"
          required
        />
        {state.errors?.email && (
          <p className="text-[11px] text-red-400">{state.errors.email}</p>
        )}
      </div>

      {/* Senha */}
      <div className="space-y-1">
        <label className="text-xs text-slate-200" htmlFor="password">
          Senha
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          className="bg-slate-950/60 border-slate-700"
          required
        />
        {state.errors?.password && (
          <p className="text-[11px] text-red-400">{state.errors.password}</p>
        )}
      </div>

      {/* Confirmar senha */}
      <div className="space-y-1">
        <label className="text-xs text-slate-200" htmlFor="confirmPassword">
          Confirmar senha
        </label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          placeholder="Repita a senha"
          className="bg-slate-950/60 border-slate-700"
          required
        />
        {state.errors?.confirmPassword && (
          <p className="text-[11px] text-red-400">
            {state.errors.confirmPassword}
          </p>
        )}
      </div>

      {/* Erro geral */}
      {state.errors?._form && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-md px-3 py-2">
          {state.errors._form}
        </p>
      )}

      <SubmitButton label="Registrar" />

      <p className="text-[11px] text-slate-500 text-center">
        Já tem conta?{" "}
        <a
          href="/auth/login"
          className="text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline"
        >
          Entrar
        </a>
      </p>
    </form>
  );
}
