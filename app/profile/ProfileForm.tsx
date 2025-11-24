"use client";

import React, { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
    updateProfileAction,
    type ProfileFormState,
} from "./actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const initialState: ProfileFormState = {
    success: false,
    errors: {},
};

function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button
            type="submit"
            disabled={pending}
            className="w-full md:w-auto px-4"
        >
            {pending ? "Salvando..." : "Salvar alterações"}
        </Button>
    );
}

export function ProfileForm(props: {
    defaultName?: string | null;
    defaultBio?: string | null;
}) {
    const [state, formAction] = useActionState(
        updateProfileAction,
        initialState
    );

    const [avatarName, setAvatarName] = useState<string>(
        "Nenhum arquivo selecionado"
    );

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        setAvatarName(file ? file.name : "Nenhum arquivo selecionado");
    };

    return (
        <form action={formAction} className="space-y-5">
            {/* FEEDBACK GERAL */}
            {state.success && state.message && (
                <div className="text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-700/60 rounded-md px-3 py-2">
                    {state.message}
                </div>
            )}

            {state.errors?._form && (
                <div className="text-xs text-red-300 bg-red-950/40 border border-red-800/60 rounded-md px-3 py-2">
                    {state.errors._form}
                </div>
            )}

            {/* INFO BÁSICA */}
            <div className="space-y-3">
                <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Informações básicas
                    </p>
                    <p className="text-[11px] text-slate-500">
                        Seu nome é opcional, mas ajuda outros jogadores a reconhecerem
                        você.
                    </p>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-slate-200" htmlFor="name">
                        Nome
                    </label>
                    <Input
                        id="name"
                        name="name"
                        defaultValue={props.defaultName ?? ""}
                        placeholder="Como você quer aparecer além do usuário?"
                        className="bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-500"
                    />
                    {state.errors?.name && (
                        <p className="text-[11px] text-red-400">
                            {state.errors.name}
                        </p>
                    )}
                </div>
            </div>

            {/* BIO */}
            <div className="space-y-3">
                <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Bio
                    </p>
                    <p className="text-[11px] text-slate-500">
                        Fale sobre seus jogos, roles e horários. Máx. 500 caracteres.
                    </p>
                </div>

                <div className="space-y-1">
                    <label className="text-xs text-slate-200" htmlFor="bio">
                        Descrição
                    </label>
                    <textarea
                        id="bio"
                        name="bio"
                        defaultValue={props.defaultBio ?? ""}
                        placeholder="Ex: Main support em Valorant, jogo à noite, gosto de time comunicativo e tranquilo."
                        className="w-full min-h-[90px] rounded-md border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                    />
                    {state.errors?.bio && (
                        <p className="text-[11px] text-red-400">
                            {state.errors.bio}
                        </p>
                    )}
                </div>
            </div>

            {/* AVATAR */}
            <div className="space-y-3">
                <div className="space-y-1">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        Foto de perfil
                    </p>
                    <p className="text-[11px] text-slate-500">
                        Essa imagem aparece no seu perfil público e nos lobbies. Use uma
                        imagem quadrada para melhor resultado.
                    </p>
                </div>

                <div className="space-y-2">
                    {/* input real escondido */}
                    <Input
                        id="avatar"
                        name="avatar"
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={handleFileChange}
                    />

                    {/* botão estilizado */}
                    <div className="flex flex-wrap items-center gap-3">
                        <label
                            htmlFor="avatar"
                            className="inline-flex items-center justify-center rounded-md border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-100 hover:border-sky-500 hover:text-sky-200 hover:bg-slate-900/80 cursor-pointer"
                        >
                            Escolher imagem
                        </label>

                        <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                            {avatarName}
                        </p>
                    </div>

                    {state.errors?.avatar && (
                        <p className="text-[11px] text-red-400">
                            {state.errors.avatar}
                        </p>
                    )}

                    <p className="text-[10px] text-slate-500">
                        Formatos aceitos: JPG, PNG ou WEBP. Tamanho máximo: 2MB.
                    </p>
                </div>
            </div>

            {/* BOTÃO */}
            <div className="pt-1 flex justify-end">
                <SubmitButton />
            </div>
        </form>
    );
}
