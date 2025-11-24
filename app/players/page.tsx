import { PlayersSearch } from "./PlayersSearch";

export default function PlayersPage() {
    return (
        <div className="space-y-6">
            <header className="space-y-3">
                <h1 className="text-2xl font-semibold tracking-tight">
                    Buscar jogadores
                </h1>
                <p className="text-sm text-slate-400 max-w-xl">
                    Encontre outros jogadores pelo nome de usuário ou nome e acesse o
                    perfil público de cada um. A busca é atualizada em tempo real
                    conforme você digita.
                </p>
            </header>

            <PlayersSearch />
        </div>
    );
}
