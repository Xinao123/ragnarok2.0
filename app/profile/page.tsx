import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardHeader,
    CardTitle,
    CardDescription,
    CardContent,
} from "@/components/ui/card";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilePage() {
    const user = await getCurrentUser();

    if (!user) {
        redirect("/auth/login");
    }

    const initials =
        (user.username || user.name || user.email || "J")[0]?.toUpperCase() ?? "J";

    const createdAtText = user.createdAt
        ? new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "medium",
        }).format(user.createdAt)
        : null;

    const publicProfileUrl = user.username ? `/u/${user.username}` : null;

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="space-y-2">
                    <p className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Configurações de perfil
                    </p>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        Gerencie como outros jogadores veem você
                    </h1>
                    <p className="text-sm text-slate-400 max-w-xl">
                        Atualize seu nome, bio e foto. Essas informações aparecem no seu
                        perfil público e nos lobbies que você cria ou participa.
                    </p>
                </div>

                {publicProfileUrl && (
                    <div className="flex items-center gap-2">
                        <Button
                            asChild
                            size="sm"
                            variant="outline"
                            className="border-sky-600/70 text-sky-300 hover:bg-sky-900/30"
                        >
                            <Link href={publicProfileUrl}>Ver perfil público</Link>
                        </Button>
                    </div>
                )}
            </header>

            <div className="grid gap-6 md:grid-cols-[2fr,3fr]">
                {/* RESUMO / PREVIEW */}
                <Card className="border-slate-800 bg-slate-900/80">
                    <CardHeader>
                        <CardTitle className="text-base">Resumo do seu perfil</CardTitle>
                        <CardDescription className="text-xs">
                            Uma visão rápida de como você aparece no Ragnarok.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 text-sm">
                        <div className="flex items-center gap-3">
                            {user.avatarUrl ? (
                                <img
                                    src={user.avatarUrl}
                                    alt="Foto de perfil"
                                    className="h-16 w-16 rounded-full object-cover border border-slate-700"
                                />
                            ) : (
                                <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 text-2xl border border-slate-700">
                                    {initials}
                                </div>
                            )}
                            <div className="space-y-1">
                                <p className="text-base font-semibold text-slate-100">
                                    {user.username || "Jogador"}
                                </p>
                                {user.name && (
                                    <p className="text-xs text-slate-300">{user.name}</p>
                                )}
                                {publicProfileUrl && (
                                    <Link
                                        href={publicProfileUrl}
                                        className="text-[11px] text-sky-400 hover:text-sky-300"
                                    >
                                        /u/{user.username}
                                    </Link>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-slate-800 pt-3 space-y-2 text-xs">
                            <div>
                                <span className="text-slate-400 text-[11px]">E-mail</span>
                                <p className="text-slate-100 text-sm">
                                    {user.email || "Não definido"}
                                </p>
                            </div>

                            {createdAtText && (
                                <div>
                                    <span className="text-slate-400 text-[11px]">
                                        Conta criada em
                                    </span>
                                    <p className="text-slate-100 text-sm">{createdAtText}</p>
                                </div>
                            )}

                            <div>
                                <span className="text-slate-400 text-[11px]">Bio</span>
                                <p className="text-slate-100 text-sm whitespace-pre-wrap">
                                    {user.bio || "Você ainda não escreveu uma bio."}
                                </p>
                            </div>
                        </div>

                        <p className="text-[11px] text-slate-500 border border-slate-800 rounded-md px-3 py-2 bg-slate-950/60">
                            Dica: use a bio para falar sobre seus jogos favoritos, roles
                            (Duelista, Suporte, etc.), horário que costuma jogar e seu estilo
                            (casual, tryhard, competitivo).
                        </p>
                    </CardContent>
                </Card>

                {/* FORMULÁRIO DE EDIÇÃO */}
                <Card className="border-slate-800 bg-slate-900/80">
                    <CardHeader>
                        <CardTitle className="text-base">Editar informações</CardTitle>
                        <CardDescription className="text-xs">
                            As mudanças são salvas imediatamente e refletidas no seu perfil
                            público.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ProfileForm defaultName={user.name} defaultBio={user.bio} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
