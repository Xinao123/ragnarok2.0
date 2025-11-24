"use client";

import { useEffect } from "react";

export function PresenceHeartbeat() {
    useEffect(() => {
        const ping = () => {
            fetch("/api/status/heartbeat", { method: "POST" }).catch(() => { });
        };

        // ping imediato
        ping();

        const interval = setInterval(ping, 60_000); // 1 min

        const onVisibility = () => {
            if (document.visibilityState === "visible") ping();
        };

        window.addEventListener("focus", ping);
        document.addEventListener("visibilitychange", onVisibility);

        return () => {
            clearInterval(interval);
            window.removeEventListener("focus", ping);
            document.removeEventListener("visibilitychange", onVisibility);
        };
    }, []);

    return null;
}
