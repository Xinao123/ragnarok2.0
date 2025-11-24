import Link from "next/link";
import {
    getSteamAppDetails,
    getGlobalAchievements,
    SteamGlobalAchievement,
} from "@/lib/steam";

const TEST_APPS = [
    { appId: 730, label: "Counter-Strike 2" },
    { appId: 1808500, label: "Arc Riders" },
    { appId: 2807960, label: "BF6" },
];

async function getTopAchievements(
    appId: number,
    limit = 3
): Promise<SteamGlobalAchievement[]> {
    const achievements = await getGlobalAchievements(appId);

    return achievements
        .filter((a) => Number.isFinite(a.percent))
        .sort((a, b) => b.percent - a.percent)
        .slice(0, limit);
}

export default async function SteamGamesTestPage() {
    const gamesWithData = await Promise.all(
        TEST_APPS.map(async ({ appId, label }) => {
            const [details, topAchievements] = await Promise.all([
                getSteamAppDetails(appId),
                getTopAchievements(appId, 3),
            ]);

            return {
                appId,
                label,
                details,
                topAchievements,
            };
        })
    );

    return (
        <div className="space-y-8">
            <section className="space-y-2">
                <h1 className="text-2xl font-semibold text-slate-100">
                    Teste de integração com a Steam
                </h1>
                <p className="text-sm text-slate-400 max-w-xl">
                    Esta página é apenas um sandbox para testar a integração com a Steam
                    Web API, carregando algumas informações de jogos (capa, descrição e
                    conquistas globais). Nada aqui usa banco de dados, é tudo hardcoded.
                </p>
            </section>

            <section className="space-y-3">
                <h2 className="text-lg font-semibold text-slate-100">
                    Jogos de exemplo
                </h2>
                <p className="text-xs text-slate-400 max-w-xl">
                    Estamos consumindo os endpoints públicos da Steam para buscar
                    informações básicas dos jogos abaixo.
                </p>

                <div className="grid gap-4 md:grid-cols-3">
                    {gamesWithData.map(({ appId, label, details, topAchievements }) => (
                        <div
                            key={appId}
                            className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden flex flex-col"
                        >
                            {details?.headerImage ? (
                                <img
                                    src={details.headerImage}
                                    alt={details.name}
                                    className="w-full h-32 object-cover border-b border-slate-800"
                                />
                            ) : (
                                <div className="w-full h-32 bg-slate-900 border-b border-slate-800 flex items-center justify-center text-xs text-slate-500">
                                    Sem imagem disponível
                                </div>
                            )}

                            <div className="p-3 flex-1 flex flex-col gap-2">
                                <div>
                                    <h3 className="text-sm font-semibold text-slate-100 truncate">
                                        {details?.name ?? label}
                                    </h3>
                                    <p className="text-[11px] text-slate-400 line-clamp-3 mt-1">
                                        {details?.shortDescription ??
                                            "Jogo de exemplo para testar a integração com a API da Steam."}
                                    </p>
                                </div>

                                {topAchievements.length > 0 && (
                                    <div className="mt-1">
                                        <p className="text-[10px] uppercase tracking-wide text-slate-500 mb-1">
                                            Conquistas globais mais comuns
                                        </p>
                                        <ul className="space-y-0.5">
                                            {topAchievements.map((ach) => (
                                                <li
                                                    key={ach.name}
                                                    className="flex items-center justify-between text-[11px] text-slate-300"
                                                >
                                                    <span className="truncate max-w-[70%]">
                                                        {ach.name}
                                                    </span>
                                                    <span className="text-slate-400">
                                                        {Number.isFinite(ach.percent)
                                                            ? ach.percent.toFixed(1)
                                                            : "0.0"}
                                                        %
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                <div className="mt-2 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-500">AppID: {appId}</span>
                                    {details?.steamUrl && (
                                        <a
                                            href={details.steamUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-sky-400 hover:text-sky-300"
                                        >
                                            Ver na Steam
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <p className="text-[11px] text-slate-500">
                    Você pode editar a lista <code>TEST_APPS</code> em{" "}
                    <code>app/steam-games/page.tsx</code> para testar outros jogos
                    (basta trocar o <code>appId</code>).
                </p>
            </section>

            <section className="border-t border-slate-800 pt-4 text-[11px] text-slate-500">
                <p>
                    Esta página é apenas para testes internos da integração com a Steam.
                    No futuro podemos usar essa mesma abordagem na home ou em páginas de
                    detalhes dos jogos do Ragnarok.
                </p>
                <p className="mt-1">
                    Voltar para{" "}
                    <Link href="/" className="text-sky-400 hover:text-sky-300">
                        a página inicial
                    </Link>
                    .
                </p>
            </section>
        </div>
    );
}
