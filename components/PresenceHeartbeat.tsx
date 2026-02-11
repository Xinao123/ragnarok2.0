"use client";

import { useEffect } from "react";
import { withCsrf } from "@/lib/csrf-client";

export function PresenceHeartbeat() {
    useEffect(() => {
        const ping = () => {
            withCsrf({ method: "POST" })
                .then((init) => fetch("/api/status/heartbeat", init))
                .catch(() => { });
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
