"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type AuthFormState } from "../actions";
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
      {pending ? "Entrando..." : label}
    </Button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialState);

  return (
    <form
      action={formAction}
      className="space-y-4 max-w-sm w-full mx-auto border border-slate-800 bg-slate-900/70 rounded-xl p-5"
    >
      <h1 className="text-lg font-semibold text-center mb-2">
        Entrar no Ragnarok
      </h1>

      <div className="space-y-1">
        <label className="text-xs text-slate-200" htmlFor="username">
          Usuário
        </label>
        <Input
          id="username"
          name="username"
          placeholder="ex: cabritinha"
          className="bg-slate-950/60 border-slate-700"
          required
        />
      </div>

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
      </div>

      {state.errors?._form && (
        <p className="text-xs text-red-400 bg-red-950/40 border border-red-800/60 rounded-md px-3 py-2">
          {state.errors._form}
        </p>
      )}

      <SubmitButton label="Entrar" />

      <p className="text-[11px] text-slate-500 text-center">
        Ainda não tem conta?{" "}
        <a
          href="/auth/register"
          className="text-sky-400 hover:text-sky-300 underline-offset-2 hover:underline"
        >
          Criar conta
        </a>
      </p>
    </form>
  );
}

