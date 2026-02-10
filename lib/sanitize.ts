import DOMPurify from "isomorphic-dompurify";

// =============================
// SANITIZAÇÃO DE HTML/TEXT
// =============================

/**
 * Sanitiza HTML removendo TODOS os scripts e tags perigosas
 * Retorna apenas texto puro (sem HTML)
 * 
 * Use para: bio, descriptions, titles, usernames
 * 
 * @example
 * ```ts
 * const clean = sanitizeText(user.bio);
 * <p>{clean}</p>
 * ```
 */
export function sanitizeText(dirty: string | null | undefined): string {
  if (!dirty) return "";

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [], // ✅ Remove TODAS as tags HTML
    ALLOWED_ATTR: [], // ✅ Remove TODOS os atributos
    KEEP_CONTENT: true, // ✅ Mantém o texto dentro das tags
  }).trim();
}

/**
 * Sanitiza HTML permitindo apenas formatação básica
 * 
 * Tags permitidas: <p>, <br>, <strong>, <em>, <code>, <pre>, <a>
 * 
 * Use para: mensagens de chat, posts, artigos
 * 
 * @example
 * ```ts
 * const clean = sanitizeMarkdown(message.content);
 * <div dangerouslySetInnerHTML={{ __html: clean }} />
 * ```
 */
export function sanitizeMarkdown(dirty: string | null | undefined): string {
  if (!dirty) return "";

  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "code",
      "pre",
      "a",
      "ul",
      "ol",
      "li",
    ],
    ALLOWED_ATTR: ["href", "target", "rel"],
    ALLOWED_URI_REGEXP: /^https?:\/\//i, // Apenas URLs HTTPS
  });
}

/**
 * Sanitiza URL removendo javascript: e data: URIs
 * 
 * Use para: avatarUrl, backgroundImageUrl, links externos
 * 
 * @example
 * ```ts
 * const safeUrl = sanitizeURL(user.avatarUrl);
 * <img src={safeUrl} />
 * ```
 */
export function sanitizeURL(url: string | null | undefined): string | null {
  if (!url) return null;

  // Remove espaços
  const cleaned = url.trim();

  // ❌ Bloqueia javascript: e data:
  if (
    cleaned.toLowerCase().startsWith("javascript:") ||
    cleaned.toLowerCase().startsWith("data:")
  ) {
    console.warn("[Security] Blocked dangerous URL:", cleaned);
    return null;
  }

  // ✅ Permite apenas http/https ou caminhos relativos
  if (
    cleaned.startsWith("http://") ||
    cleaned.startsWith("https://") ||
    cleaned.startsWith("/")
  ) {
    return cleaned;
  }

  // Assume URL relativa
  return cleaned;
}

/**
 * Sanitiza atributos de classe CSS
 * Remove classes potencialmente perigosas
 * 
 * Use para: classes dinâmicas vindas do usuário
 */
export function sanitizeClassName(
  className: string | null | undefined
): string {
  if (!className) return "";

  // Remove tudo que não for letra, número, hífen ou espaço
  return className.replace(/[^a-zA-Z0-9\s\-_]/g, "").trim();
}

/**
 * Escapa caracteres especiais para prevenir XSS em atributos HTML
 * 
 * Use para: title, alt, data-*
 * 
 * @example
 * ```ts
 * <img title={escapeAttribute(user.name)} />
 * ```
 */
export function escapeAttribute(str: string | null | undefined): string {
  if (!str) return "";

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Remove ou escapa emojis perigosos (zero-width, RTL overrides)
 * 
 * Use para: usernames, títulos que vão aparecer em notificações
 */
export function sanitizeEmojis(str: string | null | undefined): string {
  if (!str) return "";

  return (
    str
      // Remove zero-width characters
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      // Remove RTL/LTR override
      .replace(/[\u202A-\u202E]/g, "")
      // Remove other invisible chars
      .replace(/[\u2060-\u2069]/g, "")
      .trim()
  );
}

/**
 * Limita tamanho de string e adiciona "..." se necessário
 * 
 * @example
 * ```ts
 * const short = truncate(longText, 100); // "Long text here..."
 * ```
 */
export function truncate(
  str: string | null | undefined,
  maxLength: number
): string {
  if (!str) return "";
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Sanitiza input completo (combina várias técnicas)
 * 
 * Use como última camada de defesa
 * 
 * @example
 * ```ts
 * const safe = sanitizeFull(userInput);
 * ```
 */
export function sanitizeFull(input: string | null | undefined): string {
  if (!input) return "";

  let clean = input;

  // 1. Remove emojis perigosos
  clean = sanitizeEmojis(clean);

  // 2. Sanitiza HTML
  clean = sanitizeText(clean);

  // 3. Trunca se muito longo
  clean = truncate(clean, 5000);

  return clean;
}

// =============================
// VALIDADORES
// =============================

/**
 * Verifica se string contém apenas caracteres seguros
 */
export function isSafeString(str: string): boolean {
  // Permite letras, números, espaços e pontuação básica
  const safeRegex = /^[a-zA-Z0-9\s\.,!?\-_@#$%&*()\[\]{}:;"'+=]+$/;
  return safeRegex.test(str);
}

/**
 * Verifica se URL é segura
 */
export function isSafeURL(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Apenas http/https
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return false;
    }

    // Não permite localhost em produção
    if (
      process.env.NODE_ENV === "production" &&
      (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1")
    ) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// =============================
// EXPORTS
// =============================

export const sanitize = {
  text: sanitizeText,
  markdown: sanitizeMarkdown,
  url: sanitizeURL,
  className: sanitizeClassName,
  attribute: escapeAttribute,
  emojis: sanitizeEmojis,
  full: sanitizeFull,
  truncate,
};

export const validate = {
  isSafe: isSafeString,
  isSafeURL,
};