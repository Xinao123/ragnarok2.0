"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { logError } from "@/lib/logger";
import {
    Card,
    CardContent,
} from "@/components/ui/card";

type UserResult = {
    id: string;
    username: string | null;
    name: string | null;
    avatarUrl: string | null;
    bio: string | null;
    createdAt: string; // vem como string no JSON
};

export function PlayersSearch() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UserResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [hasSearched, setHasSearched] = useState(false);

    useEffect(() => {
        const trimmed = query.trim();

        // se tiver menos de 2 letras, não busca nada
        if (trimmed.length < 2) {
            setResults([]);
            setIsLoading(false);
            setHasSearched(false);
            return;
        }

        setHasSearched(true);
        setIsLoading(true);

        const controller = new AbortController();
        const timeout = setTimeout(async () => {
            try {
                const res = await fetch(
                    `/api/players/search?q=${encodeURIComponent(trimmed)}`,
                    { signal: controller.signal }
                );
                if (!res.ok) throw new Error("Erro ao buscar jogadores");

                const data = (await res.json()) as { users: UserResult[] };
                setResults(data.users);
            } catch (err: any) {
                if (err.name !== "AbortError") {
                    logError(err);
                }
            } finally {
                setIsLoading(false);
            }
        }, 300); // debounce de 300ms

        return () => {
            controller.abort();
            clearTimeout(timeout);
        };
    }, [query]);

    return (
        <section className="space-y-4">
            {/* Campo de busca */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Input
                    type="text"
                    name="q"
                    placeholder="Digite pelo menos 2 letras do usuário ou nome..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="bg-slate-950/70 border-slate-700 text-sm text-slate-100 placeholder:text-slate-500"
                />
                <Button
                    type="button"
                    size="sm"
                    className="px-4 text-xs sm:text-sm"
                    disabled
                >
                    Busca em tempo real
                </Button>
            </div>

            {/* Mensagem auxiliar */}
            <p className="text-[11px] text-slate-500">
                {query.trim().length < 2
                    ? "Comece a digitar para buscar jogadores. Use pelo menos 2 caracteres."
                    : isLoading
                        ? "Buscando jogadores..."
                        : results.length === 0 && hasSearched
                            ? `Nenhum jogador encontrado para "${query.trim()}".`
                            : `Exibindo ${results.length} resultado(s).`}
            </p>

            {/* Resultados */}
            <div className="space-y-3">
                {results.map((user) => {
                    const initials =
                        (user.username || user.name || "J")[0]?.toUpperCase() ?? "J";

                    const createdAtText = new Intl.DateTimeFormat("pt-BR", {
                        dateStyle: "medium",
                    }).format(new Date(user.createdAt));

                    const canOpenProfile = Boolean(user.username);
                    const profileHref = canOpenProfile
                        ? `/u/${user.username}`
                        : "#";

                    return (
                        <Card
                            key={user.id}
                            className="border-slate-800 bg-slate-900/80"
                        >
                            <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-3 min-w-0">
                                    {user.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={`Avatar de ${user.username}`}
                                            className="h-10 w-10 rounded-full object-cover border border-slate-700"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 text-sm border border-slate-700">
                                            {initials}
                                        </div>
                                    )}

                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="font-medium text-slate-100 truncate">
                                                {user.username || "Jogador"}
                                            </span>
                                            {user.name && (
                                                <span className="text-[11px] text-slate-400 truncate">
                                                    • {user.name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-slate-500 truncate">
                                            Conta criada em {createdAtText}
                                        </p>
                                        {user.bio && (
                                            <p className="text-[11px] text-slate-400 line-clamp-2">
                                                {user.bio}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex-shrink-0">
                                    {canOpenProfile ? (
                                        <Button
                                            asChild
                                            size="sm"
                                            variant="outline"
                                            className="border-sky-600/70 text-sky-300 hover:bg-sky-900/30 text-[11px]"
                                        >
                                            <Link href={profileHref}>Ver perfil</Link>
                                        </Button>
                                    ) : (
                                        <span className="text-[10px] text-slate-500">
                                            Perfil indisponível
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </section>
    );
}
