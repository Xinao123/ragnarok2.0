type JsonLike = Record<string, unknown>;

const SENSITIVE_KEY_RE =
  /(password|pass|secret|token|authorization|cookie|session|api[-_]?key|auth)/i;

function isDev() {
  return process.env.NODE_ENV !== "production";
}

function redactValue(
  value: unknown,
  depth = 0,
  seen?: WeakSet<object>
): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: isDev() ? value.stack : undefined,
    };
  }

  if (depth >= 4) return "[truncated]";

  if (Array.isArray(value)) {
    return value.map((item) => redactValue(item, depth + 1, seen));
  }

  if (typeof value === "object") {
    const obj = value as JsonLike;
    const currentSeen = seen ?? new WeakSet<object>();
    if (currentSeen.has(obj)) return "[circular]";
    currentSeen.add(obj);

    const out: JsonLike = {};
    for (const [key, raw] of Object.entries(obj)) {
      if (SENSITIVE_KEY_RE.test(key)) {
        out[key] = "[redacted]";
      } else {
        out[key] = redactValue(raw, depth + 1, currentSeen);
      }
    }
    return out;
  }

  return String(value);
}

export function logError(...args: unknown[]) {
  if (isDev()) {
    console.error(...args);
    return;
  }

  const context = typeof args[0] === "string" ? args[0] : "application-error";
  const startAt = typeof args[0] === "string" ? 1 : 0;
  const safeArgs = args.slice(startAt).map((arg) => redactValue(arg));

  console.error(`[${context}]`, {
    context,
    details: safeArgs,
    timestamp: new Date().toISOString(),
  });
}

export function logWarn(...args: unknown[]) {
  if (isDev()) {
    console.warn(...args);
    return;
  }

  const context = typeof args[0] === "string" ? args[0] : "application-warning";
  const startAt = typeof args[0] === "string" ? 1 : 0;
  const safeArgs = args.slice(startAt).map((arg) => redactValue(arg));

  console.warn(`[${context}]`, {
    context,
    details: safeArgs,
    timestamp: new Date().toISOString(),
  });
}
