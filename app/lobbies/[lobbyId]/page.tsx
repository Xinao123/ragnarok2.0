import Link from "next/link";
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

type PageProps = {
  params: { lobbyId: string };
};

export default async function LobbyDetailPage({ params }: PageProps) {
  console.log("PARAMS LOBBY DETAIL:", params);

  const lobbyId = params.lobbyId;

  if (!lobbyId) {
    notFound();
  }

  const [user, lobby] = await Promise.all([
    getCurrentUser(),
    prisma.lobby.findUnique({
      where: { id: lobbyId },
      include: {
        game: true,
        owner: true,
        members: {
          where: { status: MemberStatus.ACTIVE },
          include: { user: true },
        },
      },
    }),
  ]);

  if (!lobby) {
    notFound();
  }

  const meId = user?.id ?? null;
  const isLeader = meId === lobby.ownerId;

  const currentPlayers = lobby.members.length;
  const isFull =
    currentPlayers >= lobby.maxPlayers || lobby.status === LobbyStatus.FULL;

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-6">
      {/* topo */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {lobby.title}
          </h1>
          <p className="text-sm text-slate-400">
            {lobby.game.name} • {lobby.game.platform}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full border ${isFull
              ? "border-red-500/50 text-red-300 bg-red-900/20"
              : "border-emerald-500/50 text-emerald-300 bg-emerald-900/10"
              }`}
          >
            {lobby.status} • {currentPlayers}/{lobby.maxPlayers}
          </span>
          <Button asChild size="sm" variant="outline" className="text-xs px-3">
            <Link href="/lobbies">Voltar para lobbies</Link>
          </Button>
        </div>
      </div>

      {/* cartão principal */}
      <Card className="border-slate-800 bg-slate-900/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Informações do lobby</CardTitle>
          <CardDescription className="text-xs text-slate-400">
            Detalhes da sala e jogadores conectados. Em breve aqui entra o chat
            em grupo e ferramentas de party.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-0 text-sm text-slate-300">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-[11px] text-slate-400 mb-1">Jogo</p>
              <p>
                {lobby.game.name}{" "}
                <span className="text-[11px] text-slate-500">
                  • {lobby.game.platform}
                </span>
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 mb-1">Idioma</p>
              <p>{lobby.language || "Não informado"}</p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 mb-1">Região</p>
              <p>{lobby.region || "Global"}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] text-slate-400 mb-1">Descrição</p>
            <p className="text-sm text-slate-200">
              {lobby.description || "Sem descrição no momento."}
            </p>
          </div>

          <div>
            <p className="text-[11px] text-slate-400 mb-2">
              Jogadores neste lobby
            </p>
            <div className="space-y-2">
              {lobby.members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-md bg-slate-950/60 border border-slate-800 px-3 py-2"
                >
                  <div className="flex flex-col">
                    <span className="text-sm text-slate-100">
                      {m.user.username || m.user.name || "Jogador"}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {m.role === "LEADER" ? "Líder" : "Membro"}
                      {meId === m.userId ? " • você" : ""}
                    </span>
                  </div>
                </div>
              ))}
              {lobby.members.length === 0 && (
                <p className="text-xs text-slate-500">
                  Ninguém conectado ainda.
                </p>
              )}
            </div>
          </div>

          {isLeader && (
            <p className="text-[11px] text-sky-300">
              Você é o líder deste lobby. Em breve você poderá configurar
              permissões, enviar convites rápidos e fechar a sala por aqui.
            </p>
          )}

          <p className="text-[10px] text-slate-500 pt-2">
            ID do lobby: <span className="font-mono">{lobby.id}</span>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
