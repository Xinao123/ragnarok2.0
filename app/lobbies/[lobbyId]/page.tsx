import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: { lobbyId: string };
};

export default async function LobbyDetailDebug({ params }: PageProps) {
  const lobbyId = params?.lobbyId;

  console.log("DEBUG LOBBY DETAIL params:", params);

  const lobby = await prisma.lobby.findUnique({
    where: { id: lobbyId },
    include: {
      game: true,
      owner: true,
      members: true,
    },
  });

  console.log("DEBUG LOBBY DETAIL result:", lobbyId, lobby);

  return (
    <div className="p-4 text-slate-100">
      <h1 className="text-xl font-bold mb-2">Lobby debug</h1>

      <p className="text-xs mb-2">
        ID da URL: <code className="bg-slate-900 px-1 py-0.5 rounded">{lobbyId}</code>
      </p>

      {!lobby && (
        <p className="text-sm text-red-400">
          Prisma retornou <b>null</b> para esse ID. (Se você ainda estiver vendo
          a tela 404 padrão do Next, então essa página nem está sendo carregada.)
        </p>
      )}

      {lobby && (
        <>
          <p className="text-sm text-emerald-400 mb-2">
            Prisma encontrou o lobby! Veja os dados crus abaixo:
          </p>
          <pre className="mt-2 text-xs whitespace-pre-wrap bg-slate-900 rounded p-3">
            {JSON.stringify(lobby, null, 2)}
          </pre>
        </>
      )}
    </div>
  );
}
