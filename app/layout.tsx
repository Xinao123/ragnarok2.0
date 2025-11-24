// imports no topo:
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { FriendsDock } from "@/components/FriendsDock";
import { UserMenu } from "@/components/UserMenu";
import { PresenceHeartbeat } from "@/components/PresenceHeartbeat";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ragnarok LFG",
  description:
    "Encontre times e lobbies para seus jogos favoritos em tempo real.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="pt-BR">
      <body
        className={
          inter.className +
          " min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-50 antialiased"
        }
      >
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b border-slate-800/60 bg-black/40 backdrop-blur">
            <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 border border-sky-500/40 text-sky-300 text-xl font-bold">
                  R
                </span>
                <div className="flex flex-col leading-tight">
                  <span className="font-semibold text-sm tracking-wide">
                    Ragnarok
                  </span>
                  <span className="text-xs text-slate-400">
                    LFG &amp; Lobbies em tempo real
                  </span>
                </div>
              </div>

              {/* Navegação + auth */}
              <div className="flex items-center gap-6 text-xs text-slate-400">
                <nav className="flex items-center gap-3">
                  <Link
                    href="/"
                    className="hover:text-slate-100 transition-colors"
                  >
                    Início
                  </Link>
                  <Link
                    href="/players"
                    className="hover:text-slate-100 transition-colors"
                  >
                    Jogadores
                  </Link>
                  <Link
                    href="/lobbies"
                    className="hover:text-slate-100 transition-colors"
                  >
                    Lobbies
                  </Link>

                </nav>

                {user ? (
                  <UserMenu
                    user={{
                      id: user.id,
                      username: user.username,
                      name: user.name,
                      email: user.email,
                      avatarUrl: user.avatarUrl ?? undefined,
                    }}
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <Link
                      href="/auth/login"
                      className="hover:text-slate-100 transition-colors"
                    >
                      Login
                    </Link>
                    <Link
                      href="/auth/register"
                      className="text-[11px] rounded-full border border-sky-600/70 px-3 py-1 text-sky-300 hover:bg-sky-900/30 transition-colors"
                    >
                      Criar conta
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Conteúdo */}
          <main className="flex-1">
            <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
          </main>
          {user && <PresenceHeartbeat />}
          {user && <FriendsDock />}


          {/* Footer */}
          <footer className="border-t border-slate-800/60 bg-black/40 text-xs text-slate-500">
            <div className="mx-auto max-w-5xl px-4 py-3 flex justify-between">
              <span>Ragnarok 2.0 • LFG para gamers</span>
              <span>by Xinao12</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
