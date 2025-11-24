import crypto from "crypto";

const KEY_B64 = process.env.CHAT_ENCRYPTION_KEY!;
const KEY = Buffer.from(KEY_B64, "base64"); // 32 bytes

export function encryptMessage(plain: string) {
  const iv = crypto.randomBytes(12); // GCM nonce size
  const cipher = crypto.createCipheriv("aes-256-gcm", KEY, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plain, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  return { ciphertext, iv, authTag, algorithm: "AES-256-GCM" };
}

export function decryptMessage(
  ciphertext: Buffer,
  iv: Buffer,
  authTag: Buffer
) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", KEY, iv);
  decipher.setAuthTag(authTag);

  const plain = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]);

  return plain.toString("utf8");
}
