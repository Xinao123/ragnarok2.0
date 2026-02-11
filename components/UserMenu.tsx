"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, User, Settings, Check } from "lucide-react";
import { logoutAction } from "@/app/auth/actions";
import { withCsrf } from "@/lib/csrf-client";

type StatusValue = "ONLINE" | "AWAY" | "BUSY" | "INVISIBLE" | "OFFLINE";

type UserMenuUser = {
  id: string;
  username: string | null;
  name?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  status?: StatusValue;
  lastSeen?: string | Date | null;
};

type Props = { user: UserMenuUser };

const STORAGE_KEY = "ragnarok:status";

const statusClass = (status?: StatusValue) => {
  switch (status) {
    case "ONLINE":
      return "bg-emerald-400";
    case "AWAY":
      return "bg-yellow-400";
    case "BUSY":
      return "bg-rose-400";
    case "INVISIBLE":
      return "bg-slate-500";
    default:
      return "bg-slate-600";
  }
};

const statusLabel = (status?: StatusValue) => {
  switch (status) {
    case "ONLINE":
      return "Online";
    case "AWAY":
      return "Ausente";
    case "BUSY":
      return "Ocupado";
    case "INVISIBLE":
      return "Invisível";
    default:
      return "Offline";
  }
};

export function UserMenu({ user }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  const options: StatusValue[] = [
    "ONLINE",
    "AWAY",
    "BUSY",
    "INVISIBLE",
    "OFFLINE",
  ];

  // status local
  const [currentStatus, setCurrentStatus] = useState<StatusValue>(
    user.status ?? "OFFLINE"
  );

  // ✅ ao montar no client, tenta restaurar último status escolhido
  useEffect(() => {
    try {
      const persisted = localStorage.getItem(STORAGE_KEY) as StatusValue | null;
      if (persisted && options.includes(persisted)) {
        setCurrentStatus(persisted);
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✅ quando o server mandar status (ex: refresh), sincroniza e salva
  useEffect(() => {
    if (user.status && user.status !== currentStatus) {
      setCurrentStatus(user.status);
      try {
        localStorage.setItem(STORAGE_KEY, user.status);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.status]);

  const displayName = useMemo(() => {
    return user.username || user.name || user.email?.split("@")[0] || "Jogador";
  }, [user]);

  const initials = useMemo(() => {
    return (displayName?.[0] || "J").toUpperCase();
  }, [displayName]);

  const selfProfileHref = user.username ? `/u/${user.username}` : "/profile";

  async function updateStatus(newStatus: StatusValue) {
    setCurrentStatus(newStatus); // optimistic

    try {
      const res = await fetch(
        "/api/status",
        await withCsrf({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
        })
      );

      if (!res.ok) {
        setCurrentStatus(user.status ?? "OFFLINE");
        return;
      }

      // ✅ persiste localmente
      try {
        localStorage.setItem(STORAGE_KEY, newStatus);
      } catch {}

      router.refresh();
      setOpen(false);
    } catch {
      setCurrentStatus(user.status ?? "OFFLINE");
    }
  }

  // fecha ao clicar fora
  useEffect(() => {
    if (!open) return;

    function onDown(e: MouseEvent | TouchEvent) {
      const target = e.target as Node;
      if (ref.current && !ref.current.contains(target)) setOpen(false);
    }

    document.addEventListener("mousedown", onDown);
    document.addEventListener("touchstart", onDown);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("touchstart", onDown);
    };
  }, [open]);

  // hover com delay
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function openNow() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setOpen(true);
  }

  function closeSoon() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => setOpen(false), 220);
  }

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

  return (
    <div
      ref={ref}
      className="relative"
      onMouseEnter={openNow}
      onMouseLeave={closeSoon}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-950/60 px-2 py-1 hover:border-sky-500 hover:bg-slate-900/80 transition-colors"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="relative">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt="Foto de perfil"
              className="h-7 w-7 rounded-full object-cover border border-slate-700"
            />
          ) : (
            <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-[11px] text-slate-200 border border-slate-700">
              {initials}
            </div>
          )}

          <span
            title={statusLabel(currentStatus)}
            className={[
              "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full",
              statusClass(currentStatus),
              "border-2 border-slate-950 shadow-sm shadow-black/60",
            ].join(" ")}
          />
        </div>

        <span className="text-[11px] text-slate-300">
          Olá,{" "}
          <span className="font-semibold text-sky-300">{displayName}</span>
        </span>

        <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
      </button>

      {open && (
        <div
          role="menu"
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-800 bg-slate-950 shadow-xl shadow-black/60 overflow-hidden z-50"
        >
          <div className="px-2 py-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-[9px] uppercase tracking-wide text-slate-500">
                Status
              </p>
              <span className="text-[9px] text-slate-400">
                {statusLabel(currentStatus)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateStatus(opt)}
                  className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] text-slate-200 hover:bg-slate-900 transition-colors"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${statusClass(
                      opt
                    )} border border-slate-900`}
                  />
                  <span className="flex-1 text-left">{statusLabel(opt)}</span>
                  {currentStatus === opt && (
                    <Check className="w-3 h-3 text-sky-300" />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-800" />

          <Link
            href={selfProfileHref}
            className="flex items-center gap-2 px-3 py-2 text-[11px] text-slate-200 hover:bg-slate-900"
            role="menuitem"
          >
            <User className="w-3.5 h-3.5 text-slate-300" />
            Meu perfil
          </Link>

          <Link
            href="/profile"
            className="flex items-center gap-2 px-3 py-2 text-[11px] text-slate-200 hover:bg-slate-900"
            role="menuitem"
          >
            <Settings className="w-3.5 h-3.5 text-slate-300" />
            Editar perfil
          </Link>

          <div className="border-t border-slate-800" />

          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-slate-200 hover:bg-slate-900"
              role="menuitem"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-300" />
              Sair
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
