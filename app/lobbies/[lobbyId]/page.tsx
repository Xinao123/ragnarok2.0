import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { LobbyStatus, MemberStatus } from "@prisma/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type PageProps = {
  params: { lobbyId: string };
};

export default async function LobbyDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  const meId = user?.id ?? null;

  const lobby = await prisma.lobby.findUnique({
    where: { id: params.lobbyId },
    include: {
      game: true,
      owner: true,
      members: {
        where: { status: MemberStatus.ACTIVE },
        include: {
          user: true,
        },
      },
    },
  });

  if (!lobby) {
    notFound();
  }

  const currentPlayers = lobby.members.length;
  const isFull =
    currentPlayers >= lobby.maxPlayers ||
    lobby.status === LobbyStatus.FULL;

  const isMember = meId
    ? lobby.members.some((m) => m.userId === meId)
    : false;

  const isLeader = meId && lobby.ownerId === meId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lobby.title}
          </h1>
          <p className="text-sm text-slate-400">
            {lobby.game.name} • {lobby.game.platform} •{" "}
            {currentPlayers}/{lobby.maxPlayers} jogadores
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${
              isFull
                ? "border-red-500/50 text-red-300 bg-red-900/20"
                : "border-emerald-500/50 text-emerald-300 bg-emerald-900/10"
            }`}
          >
            {lobby.status === "OPEN"
              ? "Aberto"
              : lobby.status === "FULL"
              ? "Cheio"
              : "Fechado"}{" "}
            • {currentPlayers}/{lobby.maxPlayers}
          </span>

          <p className="text-[11px] text-slate-500">
            Líder:{" "}
            <span className="text-slate-200">
              {lobby.owner.username ||
                lobby.owner.name ||
                "Jogador"}
            </span>
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        {/* CARD INFO PRINCIPAL */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-sm">
              Detalhes do lobby
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Aqui você vai ver as informações principais do lobby e,
              em breve, o chat em grupo em tempo real.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p className="text-slate-300">
              <span className="text-slate-400">Descrição:</span>{" "}
              {lobby.description || "Sem descrição."}
            </p>
            <p className="text-slate-300">
              <span className="text-slate-400">Idioma:</span>{" "}
              {lobby.language || "Não informado"}
            </p>
            <p className="text-slate-300">
              <span className="text-slate-400">Região:</span>{" "}
              {lobby.region || "Global"}
            </p>
            <p className="text-slate-500 text-xs">
              ID do lobby:{" "}
              <span className="font-mono">
                {lobby.id}
              </span>
            </p>

            <div className="pt-3 border-t border-slate-800 mt-3">
              <p className="text-xs text-slate-500 mb-2">
                Chat em grupo será exibido aqui futuramente. 💬
              </p>
              <Button
                size="sm"
                variant="outline"
                className="text-xs"
                asChild
              >
                <Link href="/lobbies">
                  Voltar para lista de lobbies
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* CARD PARTICIPANTES */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-sm">
              Jogadores no lobby
            </CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Veja quem já está na sala.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {lobby.members.length === 0 ? (
              <p className="text-slate-500 text-xs">
                Ainda não há jogadores listados.
              </p>
            ) : (
              <ul className="space-y-1">
                {lobby.members.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-2 rounded-md bg-slate-950/70 border border-slate-800 px-2 py-1.5"
                  >
                    <div className="flex flex-col">
                      <span className="text-slate-100 text-xs">
                        {m.user.username ||
                          m.user.name ||
                          "Jogador"}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {m.user.id === lobby.ownerId
                          ? "Líder"
                          : "Membro"}
                      </span>
                    </div>
                    {meId === m.userId && (
                      <span className="text-[10px] text-sky-400">
                        Você
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {!meId && (
              <p className="text-[11px] text-slate-500 pt-1">
                Faça login para participar dos lobbies.
              </p>
            )}

            {meId && !isMember && (
              <p className="text-[11px] text-slate-500 pt-1">
                Você ainda não entrou neste lobby. Use o botão
                &quot;Entrar no lobby&quot; na listagem para participar.
              </p>
            )}

            {meId && isMember && (
              <p className="text-[11px] text-sky-300 pt-1">
                Você faz parte deste lobby.
                {isLeader && " (Você é o líder.)"}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
