import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    const minioPublicUrl = process.env.MINIO_PUBLIC_URL;

    const imgSrc = new Set<string>(["'self'", "data:", "blob:"]);
    if (minioPublicUrl) {
      try {
        imgSrc.add(new URL(minioPublicUrl).origin);
      } catch {}
    }
    // RAWG imagens
    imgSrc.add("https://media.rawg.io");
    // fallback segura para imagens https
    imgSrc.add("https:");

    const connectSrc = new Set<string>(["'self'"]);
    if (pusherCluster) {
      connectSrc.add(`wss://ws-${pusherCluster}.pusher.com`);
      connectSrc.add(`https://sockjs-${pusherCluster}.pusher.com`);
    } else {
      connectSrc.add("wss://*.pusher.com");
      connectSrc.add("https://*.pusher.com");
    }
    connectSrc.add("https://api.rawg.io");

    const scriptSrc = new Set<string>(["'self'", "'unsafe-inline'"]);
    if (!isProd) {
      scriptSrc.add("'unsafe-eval'");
    }

    const csp = [
      "default-src 'self'",
      `script-src ${Array.from(scriptSrc).join(" ")}`,
      "style-src 'self' 'unsafe-inline'",
      `img-src ${Array.from(imgSrc).join(" ")}`,
      "font-src 'self' data:",
      `connect-src ${Array.from(connectSrc).join(" ")}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      isProd ? "upgrade-insecure-requests" : "",
    ]
      .filter(Boolean)
      .join("; ");

    const securityHeaders = [
      {
        key: "X-Content-Type-Options",
        value: "nosniff",
      },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "X-Frame-Options",
        value: "DENY",
      },
      {
        key: "Permissions-Policy",
        value:
          "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
      },
      {
        key: "Cross-Origin-Opener-Policy",
        value: "same-origin",
      },
      {
        key: "Content-Security-Policy",
        value: csp,
      },
    ];

    if (process.env.NODE_ENV === "production") {
      securityHeaders.push({
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
      });
    }

    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
