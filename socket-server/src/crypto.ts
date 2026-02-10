import crypto from "crypto";

const KEY_B64 = process.env.CHAT_ENCRYPTION_KEY;
if (!KEY_B64) {
  throw new Error("CHAT_ENCRYPTION_KEY nÃ£o configurada.");
}

const KEY = Buffer.from(KEY_B64, "base64");
if (KEY.length !== 32) {
  throw new Error(
    "CHAT_ENCRYPTION_KEY invÃ¡lida. Use uma chave base64 de 32 bytes."
  );
}

export function encryptMessage(plain: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return { ciphertext, iv, authTag, algorithm: "AES-256-GCM" };
}
