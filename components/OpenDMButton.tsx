"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export function OpenDMButton({
  otherUserId,
  toUserId,   // compat com o nome antigo
}: {
  otherUserId?: string;
  toUserId?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function openDM() {
    const targetId = otherUserId ?? toUserId;

    if (!targetId) {
      setErr("Usuário inválido para abrir DM.");
      return;
    }

    setLoading(true);
    setErr(null);

    try {
      const res = await fetch("/api/dm/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ otherUserId: targetId }), // ✅ nome certo
      });

      // ✅ se não estiver logado, manda pro login
      if (res.status === 401) {
        router.push(`/auth/login?callbackUrl=${encodeURIComponent(pathname)}`);
        return;
      }

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        setErr(`Falha ao abrir conversa. (${res.status}) ${txt}`);
        return;
      }

      const json = await res.json();
      if (!json?.conversationId) {
        setErr("Resposta inválida do servidor.");
        return;
      }

      router.push(`/dm/${json.conversationId}`);
    } catch (e) {
      console.error(e);
      setErr("Erro de rede ao abrir conversa.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        onClick={openDM}
        disabled={loading}
        className="rounded-xl bg-sky-600 hover:bg-sky-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60"
      >
        {loading ? "Abrindo..." : "Enviar mensagem"}
      </button>

      {err && <p className="text-[11px] text-rose-300">{err}</p>}
    </div>
  );
}
