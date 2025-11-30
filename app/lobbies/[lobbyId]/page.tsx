import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  LobbyStatus,
  MemberStatus,
  MemberRole,
} from "@prisma/client";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/* -------------------------------------------------------------------------- */
/*                               SERVER ACTIONS                               */
/* -------------------------------------------------------------------------- */

async function updateLobbyAction(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user?.id) return;

  const lobbyId = String(formData.get("lobbyId") || "").trim();
  if (!lobbyId) return;

  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const language = String(formData.get("language") || "").trim();
  const region = String(formData.get("region") || "").trim();
  const maxPlayersRaw = formData.get("maxPlayers");
  const statusStr = String(formData.get("status") || "").trim();

  // garante que só o dono pode editar
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    select: { ownerId: true },
  });

  if (!lobby || lobby.ownerId !== user.id) return;

  const data: any = {};

  if (title) data.title = title;
  data.description = description || null;
  data.language = language || null;
  data.region = region || null;

  const maxPlayersNum = Number(maxPlayersRaw);
  if (!Number.isNaN(maxPlayersNum) && maxPlayersNum > 0) {
    data.maxPlayers = maxPlayersNum;
  }

  if (statusStr && (statusStr in LobbyStatus)) {
    data.status = statusStr as LobbyStatus;
  }

  await prisma.lobby.update({
    where: { id: lobbyId },
    data,
  });

  revalidatePath(`/lobbies/${lobbyId}`);
  redirect(`/lobbies/${lobbyId}`);
}

async function kickMemberAction(formData: FormData) {
  "use server";

  const user = await getCurrentUser();
  if (!user?.id) return;

  const lobbyId = String(formData.get("lobbyId") || "").trim();
  const memberId = String(formData.get("memberId") || "").trim();
  if (!lobbyId || !memberId) return;

  // garante que só o dono pode kikar
  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    select: { ownerId: true },
  });

  if (!lobby || lobby.ownerId !== user.id) return;

  // só permite kikar membros ativos e que NÃO são líder
  await prisma.lobbyMember.updateMany({
    where: {
      id: memberId,
      lobbyId,
      status: MemberStatus.ACTIVE,
      role: MemberRole.MEMBER,
    },
    data: {
      status: MemberStatus.KICKED,
    },
  });

  revalidatePath(`/lobbies/${lobbyId}`);
}

/* -------------------------------------------------------------------------- */
/*                                  PAGE                                      */
/* -------------------------------------------------------------------------- */

type PageProps =
  | { params: { lobbyId: string } }
  | { params: Promise<{ lobbyId: string }> };

export default async function LobbyDetailPage(props: PageProps) {
  // resolve params mesmo se vierem como Promise/thenable
  let rawParams: any = (props as any).params;
  if (rawParams && typeof rawParams.then === "function") {
    rawParams = await rawParams;
  }

  const lobbyId = rawParams?.lobbyId as string | undefined;

  console.log("LOBBY DETAIL - resolved params:", rawParams, "lobbyId:", lobbyId);

  if (!lobbyId || typeof lobbyId !== "string") {
    return (
      <div className="max-w-3xl mx-auto py-10 space-y-4">
        <h1 className="text-2xl font-semibold">Lobby inválido</h1>
        <p className="text-sm text-slate-400">
          O identificador deste lobby não é válido.
        </p>
        <Button asChild size="sm" className="mt-2">
          <Link href="/lobbies">Voltar para lobbies</Link>
        </Button>
      </div>
    );
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
    currentPlayers >= lobby.maxPlayers ||
    lobby.status === LobbyStatus.FULL;

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
          <p className="text-[11px] text-slate-500 mt-1">
            Dono da sala:{" "}
            <span className="font-medium text-slate-300">
              {lobby.owner.username || lobby.owner.name || "Jogador"}
            </span>
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

                  {/* botão de kikar visível só pro líder e só em membros comuns */}
                  {isLeader && m.role !== "LEADER" && (
                    <form action={kickMemberAction}>
                      <input
                        type="hidden"
                        name="lobbyId"
                        value={lobby.id}
                      />
                      <input
                        type="hidden"
                        name="memberId"
                        value={m.id}
                      />
                      <Button
                        type="submit"
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-[11px]"
                      >
                        Expulsar
                      </Button>

                    </form>
                  )}
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
              Você é o líder deste lobby. Você pode editar os detalhes da sala e
              expulsar jogadores se necessário.
            </p>
          )}

          <p className="text-[10px] text-slate-500 pt-2">
            ID do lobby:{" "}
            <span className="font-mono">{lobby.id}</span>
          </p>

          {/* ------------------------------------------------------------------ */}
          {/*                 BLOCO DE CONTROLES DO LÍDER                        */}
          {/* ------------------------------------------------------------------ */}
          {isLeader && (
            <details className="mt-4 rounded-md border border-slate-800 bg-slate-950/70">
              <summary className="cursor-pointer select-none text-xs px-3 py-2 text-slate-200">
                Opções do líder (editar sala)
              </summary>
              <div className="px-3 pb-3 pt-2 space-y-3 text-xs">
                <form action={updateLobbyAction} className="space-y-3">
                  <input
                    type="hidden"
                    name="lobbyId"
                    value={lobby.id}
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">
                        Título da sala
                      </label>
                      <input
                        name="title"
                        defaultValue={lobby.title}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">
                        Máx. jogadores
                      </label>
                      <input
                        type="number"
                        name="maxPlayers"
                        min={1}
                        max={99}
                        defaultValue={lobby.maxPlayers}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">
                      Descrição
                    </label>
                    <textarea
                      name="description"
                      defaultValue={lobby.description ?? ""}
                      rows={3}
                      className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">
                        Idioma
                      </label>
                      <input
                        name="language"
                        defaultValue={lobby.language ?? ""}
                        placeholder="pt-BR, en, es..."
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">
                        Região
                      </label>
                      <input
                        name="region"
                        defaultValue={lobby.region ?? ""}
                        placeholder="BR, NA, EU..."
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">
                        Status da sala
                      </label>
                      <select
                        name="status"
                        defaultValue={lobby.status}
                        className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-sky-600/50"
                      >
                        <option value="OPEN">OPEN (aceitando players)</option>
                        <option value="FULL">FULL (lotado)</option>
                        <option value="CLOSED">
                          CLOSED (sala fechada)
                        </option>
                      </select>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="submit"
                      size="sm"
                      className="text-xs px-3"
                    >
                      Salvar alterações
                    </Button>
                  </div>
                </form>

                <p className="text-[10px] text-slate-500 pt-1">
                  Em breve: transferir liderança, sistema de convite rápido,
                  integração com voz, etc.
                </p>
              </div>
            </details>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
