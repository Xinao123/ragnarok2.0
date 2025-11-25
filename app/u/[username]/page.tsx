import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { OpenDMButton } from "@/components/OpenDMButton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { sendFriendRequestAction } from "./actions";

type PageProps = {
  params: Promise<{ username: string }>;
};

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;

  if (!username || typeof username !== "string") {
    notFound();
  }

  const [user, currentUser] = await Promise.all([
    prisma.user.findUnique({
      where: { username },
      include: {
        _count: {
          select: {
            lobbies: true,
            lobbyMembers: true,
            messages: true,
          },
        },
      },
    }),
    getCurrentUser(),
  ]);

  if (!user) notFound();

  const isOwnProfile = currentUser?.id === user.id;

  let friendState:
    | "unauthenticated"
    | "self"
    | "friends"
    | "outgoing"
    | "incoming"
    | "none" = "unauthenticated";

  if (!currentUser) {
    friendState = "unauthenticated";
  } else if (isOwnProfile) {
    friendState = "self";
  } else {
    const [id1, id2] =
      currentUser.id < user.id
        ? [currentUser.id, user.id]
        : [user.id, currentUser.id];

    const [friendship, outgoingRequest, incomingRequest] =
      await Promise.all([
        prisma.friendship.findFirst({
          where: { userAId: id1, userBId: id2 },
        }),
        prisma.friendRequest.findFirst({
          where: {
            fromUserId: currentUser.id,
            toUserId: user.id,
            status: "PENDING",
          },
        }),
        prisma.friendRequest.findFirst({
          where: {
            fromUserId: user.id,
            toUserId: currentUser.id,
            status: "PENDING",
          },
        }),
      ]);

    if (friendship) friendState = "friends";
    else if (outgoingRequest) friendState = "outgoing";
    else if (incomingRequest) friendState = "incoming";
    else friendState = "none";
  }

  const createdAtText = user.createdAt
    ? new Intl.DateTimeFormat("pt-BR", {
        dateStyle: "medium",
      }).format(user.createdAt)
    : null;

  const initials =
    (user.username || user.name || user.email || "J")[0]?.toUpperCase() ?? "J";

  const profilePath = `/u/${username}`;

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={`Avatar de ${user.username}`}
              className="h-16 w-16 rounded-full object-cover border border-slate-700"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-200 text-2xl border border-slate-700">
              {initials}
            </div>
          )}

          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight">
              {user.username}
            </h1>
            {user.name && (
              <p className="text-sm text-slate-300">{user.name}</p>
            )}
            <p className="text-xs text-slate-500">
              Perfil público do jogador no Ragnarok.
            </p>
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2">
          {/* ✅ DM só aparece se estiver logado, não for o próprio perfil e forem amigos */}
          {currentUser && !isOwnProfile && friendState === "friends" && (
            <OpenDMButton toUserId={user.id} />
          )}

          {/* Se não estiver logado, botão de login para conversar */}
          {!currentUser && !isOwnProfile && (
            <Link
              href={`/auth/login?callbackUrl=${encodeURIComponent(
                profilePath
              )}`}
            >
              <Button
                size="sm"
                variant="outline"
                className="border-slate-700 text-slate-300 hover:bg-slate-900/60"
              >
                Fazer login para conversar
              </Button>
            </Link>
          )}

          {isOwnProfile && (
            <Link href="/profile">
              <Button
                size="sm"
                variant="outline"
                className="border-sky-600/70 text-sky-300 hover:bg-sky-900/30"
              >
                Editar perfil
              </Button>
            </Link>
          )}

          {!isOwnProfile && friendState === "none" && currentUser && (
            <form action={sendFriendRequestAction}>
              <input type="hidden" name="targetUserId" value={user.id} />
              <input type="hidden" name="path" value={profilePath} />
              <Button
                type="submit"
                size="sm"
                variant="outline"
                className="border-sky-600/70 text-sky-300 hover:bg-sky-900/30"
              >
                Adicionar amigo
              </Button>
            </form>
          )}

          {!isOwnProfile && friendState === "friends" && (
            <span className="text-[11px] rounded-full border border-emerald-500/60 bg-emerald-900/20 px-3 py-1 text-emerald-300">
              Vocês são amigos
            </span>
          )}

          {!isOwnProfile && friendState === "outgoing" && (
            <span className="text-[11px] rounded-full border border-sky-500/60 bg-sky-900/20 px-3 py-1 text-sky-300">
              Solicitação enviada
            </span>
          )}

          {!isOwnProfile && friendState === "incoming" && (
            <span className="text-[11px] rounded-full border border-yellow-500/60 bg-yellow-900/20 px-3 py-1 text-yellow-300">
              Este jogador te enviou uma solicitação
            </span>
          )}
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-[2fr,3fr]">
        {/* Stats */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-base">Visão geral</CardTitle>
            <CardDescription className="text-xs">
              Algumas informações públicas sobre este jogador.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {createdAtText && (
              <div>
                <span className="text-slate-400 text-xs">
                  Conta criada em
                </span>
                <p className="text-slate-100 text-sm">{createdAtText}</p>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-2">
                <p className="text-[10px] text-slate-400">Lobbies criados</p>
                <p className="text-base font-semibold text-slate-100">
                  {user._count.lobbies}
                </p>
              </div>
              <div className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-2">
                <p className="text-[10px] text-slate-400">
                  Lobbies que entrou
                </p>
                <p className="text-base font-semibold text-slate-100">
                  {user._count.lobbyMembers}
                </p>
              </div>
              <div className="rounded-lg bg-slate-900 border border-slate-800 px-2 py-2">
                <p className="text-[10px] text-slate-400">Mensagens</p>
                <p className="text-base font-semibold text-slate-100">
                  {user._count.messages}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bio pública */}
        <Card className="border-slate-800 bg-slate-900/80">
          <CardHeader>
            <CardTitle className="text-base">Sobre este jogador</CardTitle>
            <CardDescription className="text-xs">
              Bio e informações que ele decidiu compartilhar.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-200">
            {user.bio ? (
              <p className="whitespace-pre-wrap">{user.bio}</p>
            ) : (
              <p className="text-slate-400 text-sm">
                Este jogador ainda não escreveu nada na bio.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
